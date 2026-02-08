import os
import json
from typing import Any
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field

# Define the expected output structure for the AI
class VoiceIntentOutput(BaseModel):
    action: str = Field(description="The primary action: navigate, search, accessibility, banking, or chat")
    target: str = Field(description="The specific target (e.g., 'cart', 'highContrast', 'laptop', 'balance')")
    value: Any = Field(description="An optional value for the action (e.g., true/false for toggles, search query string, or font percentage)", default=None)
    response: str = Field(description="A friendly verbal confirmation for the user (e.g., 'Opening your shopping cart now.')")

@csrf_exempt
@require_http_methods(["POST"])
def classify_voice_intent(request):
    try:
        data = json.loads(request.body)
        transcript = data.get("transcript", "").strip()
        product_id = data.get("productId") # Handled from frontend GlobalVoiceCommander
        visible_products = data.get("visibleProducts", []) # List of {id, title}

        if not transcript:
            return JsonResponse({"error": "No transcript provided"}, status=400)

        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            return JsonResponse({"error": "AI Config error"}, status=500)

        llm = ChatGroq(
            temperature=0,
            model_name="llama-3.3-70b-versatile",
            groq_api_key=api_key
        )
        
        parser = JsonOutputParser(pydantic_object=VoiceIntentOutput)

        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are the AI Voice Brain for Pay4All, an inclusive shopping app.
            Your job is to convert a user's voice transcript into a structured JSON command.

            VALID ACTIONS:
            1. 'navigate_product': Use when user says "Open [Product]", "Show [Product]", or just names a specific product like "Danone Yoghurt".
            2. 'search': Use when user says "Buy [Category]", "Find [Item]", "I want [Item]", or asks for a generic category like "Milk", "Yoghurt".
            3. Action: 'navigate'
               Targets: 'home', 'cart', 'banking', 'profile', 'login', 'results'
            4. Action: 'accessibility'
               Targets: 'highContrast', 'fontSize', 'simplifiedMode' etc.
            5. Action: 'banking'
               Targets: 'balance', 'transactions', 'affordability', 'transfer'
            6. Action: 'cart'
               Targets: 'add', 'remove', 'view', 'checkout'
            7. Action: 'status_check'
               Target: 'affordability', 'budget_status', 'cart_status'
               Explain: Use this for "Can I afford this?", "How is my budget?", "What's in my cart?".
            8. Action: 'confirm'
               Target: 'payment', 'transfer', 'generic', 'register'
            9. Action: 'cancel'
               Target: 'any'
            10. Action: 'auth'
               Targets: 'login', 'register', 'logout', 'credential_input'
            11. Action: 'chat'
               Target: 'general' (For general questions or conversation)

            CRITICAL RULES:
            - "I want to buy yoghurt" -> Action: 'search', Target: 'yoghurt' (Intent is to see options).
            - "Find me milk" -> Action: 'search', Target: 'milk'.
            - "Open Danone" -> Action: 'navigate_product', Target: 'Danone'.
            - "Danone" -> Action: 'navigate_product', Target: 'Danone' (Specific Brand).
            - "Yoghurt" -> Action: 'search', Target: 'yoghurt' (Generic Category).
            - "Add this product" -> Action: 'cart', Target: 'add' (Contextual Add).
            - "Add to cart" -> Action: 'cart', Target: 'add'.

            Output valid JSON only. Response field is for verbal confirmation.
            """),
            ("human", "User said: {transcript}"),
        ])

        chain = prompt | llm | parser
        result = chain.invoke({"transcript": transcript})

        # --- PRODUCT NAVIGATION & SEARCH LOGIC ---
        if result['action'] == 'navigate_product' or (result['action'] == 'search' and result['target']):
            from products.models import Product
            target_name = result['target']
            
            # 1. PRIORITY: Check Visible Products (Context)
            matched_context_product = None
            if visible_products:
                # Simple fuzzy check: matches target if target is in title
                for vp in visible_products:
                    if target_name.lower() in vp['title'].lower():
                        matched_context_product = vp
                        break
            
            if matched_context_product and result['action'] == 'navigate_product':
                # Context Match! Open it immediately
                result['action'] = 'navigate'
                result['target'] = f"/product/{matched_context_product['id']}"
                result['response'] = f"Opening {matched_context_product['title']}."
            else:
                # 2. Global DB Search (Fallback)
                matches = Product.objects.filter(title__icontains=target_name)
                count = matches.count()

                if result['action'] == 'navigate_product':
                    if count == 1:
                        product = matches.first()
                        result['action'] = 'navigate'
                        result['target'] = f"/product/{product.id}"
                        result['response'] = f"Opening {product.title}."
                    elif count > 1:
                        result['action'] = 'search'
                        result['target'] = target_name
                        result['response'] = f"I found {count} products matching '{target_name}'. Here they are."
                    else:
                        result['action'] = 'search'
                        result['target'] = target_name
                        result['response'] = f"I couldn't find '{target_name}' exactly, so I'm searching for it."
                
                elif result['action'] == 'search':
                     if count > 0:
                         result['response'] = f"Searching for {target_name}. Found {count} results."
                     else:
                         result['response'] = f"Searching for {target_name}."


        # --- ADVANCED: Contextual Data Binding ---
        if result['action'] == 'status_check' or (result['action'] == 'banking' and result['target'] == 'balance'):
            from .graph import create_recommendation_graph
            from cart.models import Cart
            from banking.models import BankAccount
            
            # Fetch real data for context
            account = BankAccount.objects.filter(user=request.user).first()
            cart = Cart.objects.filter(user=request.user, is_active=True).first()
            
            graph = create_recommendation_graph()
            state = {
                "query": transcript,
                "user_profile": {"user_obj": request.user},
                "cart_total": float(cart.total_price) if cart else 0,
                "bank_data": {"balance": float(account.balance) if account else 0},
                "intent": "BANKING" if result['action'] == 'banking' else "STATUS"
            }
            
            # Add product_id if mentioned or contextually provided
            if product_id:
                state["visual_ids"] = [product_id] 
            
            # Run graph to get an intelligent, data-backed explanation
            graph_result = graph.invoke(state)
            if graph_result.get('explanation'):
                result['response'] = graph_result['explanation']
        
        return JsonResponse(result)

    except Exception as e:
        print(f"Voice Intent AI Error: {e}")
        return JsonResponse({"error": str(e)}, status=500)
