import os
import json
from typing import Any, Optional
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field

# Define the expected output structure for the AI
class VoiceIntentOutput(BaseModel):
    action: str = Field(description="Primary action: auth, navigate, search, cart, banking, status_check, confirm, cancel, chat")
    target: str = Field(description="Specific target (e.g., 'login', 'balance', 'add', 'home')")
    params: Optional[dict] = Field(description="Action parameters (e.g., {productId: 123, quantity: 2})", default=None)
    value: Any = Field(description="Optional value for the action", default=None)
    response: str = Field(description="Friendly verbal confirmation for the user")

@csrf_exempt
@require_http_methods(["POST"])
def classify_voice_intent(request):
    try:
        data = json.loads(request.body)
        transcript = data.get("transcript", "").strip()
        
        if not transcript:
            return JsonResponse({"error": "No transcript provided"}, status=400)

        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            return JsonResponse({"error": "AI Config error"}, status=500)

        try:
            llm = ChatGroq(
                temperature=0,
                model_name="llama-3.3-70b-versatile",
                groq_api_key=api_key
            )
            
            parser = JsonOutputParser(pydantic_object=VoiceIntentOutput)

            prompt = ChatPromptTemplate.from_messages([
                ("system", """You are the AI Voice Brain for Pay4All, an inclusive shopping app.
                Convert user voice transcripts into structured JSON commands.

                COMPLETE ACTION REFERENCE:

                1. AUTH (action='auth')
                   - target='login': User wants to log in
                   - target='register': User wants to register
                   - target='logout': User wants to log out
                   - Extract params: email, password, username when mentioned
                   
                   Examples:
                   - "log out" → action='auth', target='logout'
                   - "sign out" → action='auth', target='logout'
                   - "logout" → action='auth', target='logout'

                2. NAVIGATE (action='navigate')
                   - target: 'home', 'cart', 'banking', 'profile', 'login', 'register', 'results'

                3. SEARCH (action='search')
                   - target: The search query (e.g., "milk", "blue shoes")
                   - params: category, price_max if mentioned

                4. CART (action='cart')
                   - target='add': Add product to cart (extract productId if mentioned)
                   - target='remove': Remove from cart
                   - target='view': View cart
                   - target='clear': Clear cart
                   - target='checkout': Proceed to checkout

                5. BANKING (action='banking')
                   - target='balance': Check balance
                   - target='transactions': View transactions
                   - target='transfer': Transfer money (extract recipient and amount)

                6. STATUS_CHECK (action='status_check')
                   - target='affordability': "Can I afford this?"
                   - target='budget_status': "How is my budget?"
                   - target='cart_status': "What's in my cart?"

                7. CONFIRM (action='confirm')
                   - Responses: "yes", "yeah", "confirm", "ok", "proceed"
                   - target='generic'

                8. CANCEL (action='cancel')
                   - Responses: "no", "cancel", "stop", "nevermind"
                   - target='generic'

                9. HELP (action='help')
                   - target='general': User asking for help or available commands
                   
                   Examples:
                   - "help" → action='help', target='general'
                   - "what can you do" → action='help', target='general'
                   - "what commands are available" → action='help', target='general'

                10. CHAT (action='chat')
                    - target='general': General questions or conversation

                PARAMETER EXTRACTION:
                - Extract numbers, product names, emails, amounts from transcript
                - Put them in params dict
                - Example: "add 2 milk" → params with productName: "milk", quantity: 2

                FOLLOW-UP DETECTION:
                - Single word responses like "yes", "no" → confirm/cancel
                - "the first one", "number 2" → params with selection: 0 or 1

                Output ONLY valid JSON. Be concise in response field.
                """),
                ("human", "User said: {transcript}"),
            ])

            chain = prompt | llm | parser
            result = chain.invoke({"transcript": transcript})

            # Ensure params is a dict
            if result.get('params') is None:
                result['params'] = {}

            # Handle status checks with real data
            if result['action'] == 'status_check':
                result = _enrich_status_check(result, request)

            # Handle banking balance with real data
            if result['action'] == 'banking' and result['target'] == 'balance':
                result = _enrich_balance_check(result, request)

            return JsonResponse(result)
            
        except Exception as llm_error:
            # Check if it's a rate limit error
            error_str = str(llm_error)
            if "rate_limit" in error_str.lower() or "429" in error_str:
                return JsonResponse({
                    "action": "chat",
                    "target": "general",
                    "params": {},
                    "value": None,
                    "response": "I'm currently experiencing high usage. Please try again in a few minutes, or use the UI buttons to navigate."
                })
            
            # Other LLM errors - return generic error
            print(f"LLM Error: {llm_error}")
            return JsonResponse({
                "action": "chat",
                "target": "general",
                "params": {},
                "value": None,
                "response": f"Sorry, I couldn't process that. Please try again or use the UI."
            })

    except Exception as e:
        print(f"Voice Intent AI Error: {e}")
        import traceback
        traceback.print_exc()
        return JsonResponse({
            "action": "chat",
            "target": "error",
            "response": "Sorry, I didn't understand that. Can you try again?",
            "error": str(e)
        }, status=200)  # Return 200 to avoid breaking voice flow


def _enrich_status_check(result, request):
    """Enrich status check with real user data"""
    try:
        from cart.models import Cart
        from banking.models import BankAccount

        target = result['target']

        if target == 'affordability':
            # Get cart total and balance
            cart = Cart.objects.filter(user=request.user, is_active=True).first()
            account = BankAccount.objects.filter(user=request.user).first()
            
            cart_total = float(cart.total_price) if cart else 0
            balance = float(account.balance) if account else 0
            
            can_afford = balance >= cart_total
            
            result['params'] = {
                'amount': cart_total,
                'balance': balance,
                'canAfford': can_afford
            }
            
            if can_afford:
                result['response'] = f"Yes, you can afford this. Your balance is {balance} TND and your cart total is {cart_total} TND."
            else:
                shortage = cart_total - balance
                result['response'] = f"No, you cannot afford this. Your balance is {balance} TND but your cart is {cart_total} TND. You are short by {shortage} TND."

        elif target == 'budget_status':
            # Get budget info
            account = BankAccount.objects.filter(user=request.user).first()
            if account:
                result['response'] = f"Your monthly budget is {account.monthly_budget} TND. You have {account.balance} TND remaining."

        elif target == 'cart_status':
            # Get cart info
            cart = Cart.objects.filter(user=request.user, is_active=True).first()
            if cart:
                item_count = cart.items.count()
                result['response'] = f"You have {item_count} item(s) in your cart. Total: {cart.total_price} TND."
            else:
                result['response'] = "Your cart is empty."

    except Exception as e:
        print(f"Error enriching status check: {e}")
        # Return original result if enrichment fails
        pass

    return result


def _enrich_balance_check(result, request):
    """Enrich balance check with real data"""
    try:
        from banking.models import BankAccount
        
        account = BankAccount.objects.filter(user=request.user).first()
        if account:
            balance = float(account.balance)
            result['params'] = {'balance': balance}
            result['response'] = f"Your current balance is {balance} TND."
        else:
            result['response'] = "No bank account found."
    except Exception as e:
        print(f"Error enriching balance check: {e}")
        pass

    return result
