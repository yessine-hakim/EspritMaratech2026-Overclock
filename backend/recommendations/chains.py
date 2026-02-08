import os
import json
from typing import Any
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field

# Initialize LLM
def get_llm():
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY not found in environment variables")
    
    return ChatGroq(
        temperature=0,
        model_name="llama-3.3-70b-versatile",
        groq_api_key=api_key
    )

# --- Budget Profiling Chain ---

class BudgetOutput(BaseModel):
    min_budget: float = Field(description="Minimum effective budget")
    target_budget: float = Field(description="Target effective budget considering value/quality")
    max_budget: float = Field(description="Absolute maximum budget constraint")
    intended_category: str = Field(description="The specific product category detected (one of: earphone, laptop, monitor, phone, smartwatch, tablet) or 'other'")
    reasoning: str = Field(description="Brief explanation of the budget inference and category selection")


# --- Intent Classification Chain ---

class IntentOutput(BaseModel):
    intent: str = Field(description="The user's intent: SHOPPING, BANKING, NAVIGATION, or ACTION")
    entities: dict[str, Any] = Field(description="Extracted entities (e.g., page, action_type, item_ref, product_type)")
    reasoning: str = Field(description="Brief reasoning for intent classification")

def get_intent_classification_chain():
    llm = get_llm()
    parser = JsonOutputParser(pydantic_object=IntentOutput)

    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an intent classifier for Pay4All, an inclusive financial shopping assistant.
        
        Classify the user's query into one of the following intents:
        - **SHOPPING**: Searching for products or general price checks.
        - **BANKING**: Checking balance, transactions, or performing transfers.
        - **NAVIGATION**: Moving between app pages (Home, Banking, Cart, Profile).
        - **ACTION**: Specific UI interactions (Add to cart, Confirm, Go back, Selection).
        - **STATUS**: Complex contextual questions about the user's current situation (e.g., "Can I afford my cart?", "What's my status?").
        
        Extraction Rules:
        - For NAVIGATION: Extract 'page' (home, banking, cart, profile, products).
        - For ACTION: Extract 'action_type' (add_to_cart, remove, confirm, select) and 'item_ref' (1st, 2nd, 'this' etc).
        - For BANKING: Extract 'amount', 'recipient', 'category' if mentioned.
        - For SHOPPING: Extract 'product_type', 'max_price' if mentioned.
        
        Output JSON only."""),
        ("human", "User Query: {query}"),
    ])

    return prompt | llm | parser


def get_budget_profiling_chain():
    llm = get_llm()
    parser = JsonOutputParser(pydantic_object=BudgetOutput)

    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a financial shopping assistant. Your goal is to infer an effective budget range for a user's product search.

**CRITICAL: You must ALWAYS infer a budget, even if the user doesn't mention price.**

Analyze the user's query and their profile to determine a realistic price range.

Budget Inference Rules:
1. **Primary Source**: Use the user's monthly budget as the foundation
2. **Category-Aware Allocation**:
   - Electronics (laptops, phones, tablets): 15-25% of monthly budget
   - Gaming gear (consoles, accessories): 10-20% of monthly budget
   - Audio equipment (headphones, speakers): 5-15% of monthly budget
   - Home appliances: 10-20% of monthly budget
   - Clothing/Fashion: 5-10% of monthly budget
   - Books/Media: 2-5% of monthly budget
   - Daily consumables: 1-3% of monthly budget
   
3. **Intent Modifiers** (adjust the percentage):
   - "Professional", "Premium", "Best" → Use upper end of range
   - "Budget", "Cheap", "Affordable" → Use lower end of range
   - "Gaming", "High-end" → Add 20-30% to range
   - No modifier → Use middle of range

4. **Explicit Price Override**: If user mentions a specific price (e.g., "under $50"), use that as max_budget

5. **Default Fallback**: If no monthly budget available, use category-based defaults:
   - Electronics: $200-500
   - Gaming: $100-300
   - Audio: $50-150
   - Other: $30-100

6. **Category Detection**: Identify the primary category from the query:
   - "watch", "smartwatch", "wearable" → smartwatch
   - "tablet", "ipad", "surface", "tab" → tablet
   - "phone", "iphone", "mobile", "smartphone" → phone
   - "laptop", "macbook", "pc", "computer" → laptop
   - "monitor", "screen", "display" → monitor
   - "earphone", "headphones", "buds", "airpods" → earphone
   - Otherwise → other

Output JSON with: min_budget, target_budget, max_budget, intended_category, reasoning

Example reasoning: "Based on $2000 monthly budget, allocated 15% ($300) for gaming mouse"
"""),
        ("human", """User Query: {query}
User Profile: {user_profile}

Infer the budget range."""),
    ])

    return prompt | llm | parser

# --- Synthesis Chain ---

def get_synthesis_chain():
    llm = get_llm()
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are Pay4All, an AI-powered inclusive assistant for blind and motor-impaired users.
        
        Your internal agents (Intent, Safety, Explanation) have processed the request.
        
        **Tone**: Clear, professional, and accessible. Use **verbal confirmation** as priority.
        
        **CONTEXTS**:
        
        1. **SHOPPING**:
           - Present products fitting the budget.
           - If a Safety check was done: Mention if it fits the current balance.
        
        2. **BANKING / STATUS**:
           - **Balance check**: State the amount clearly.
           - **Affordability**: Provide a detailed breakdown.
           - Example: "The {{product}} costs {{price}}. With your cart total of {{cart}}, you would spend {{total}}. This is within your {{budget}} monthly budget and represents {{impact}}% of it. Yes, you can afford it!"
           - Example: "This item fits your balance, but it would exceed your monthly budget by {{diff}}. I suggest waiting or finding a cheaper alternative."
        
        3. **NAVIGATION**:
           - Explain how to use the app.
        
        **Always prioritize simple, data-backed explanations.**
        """),
        ("human", """User Query: {query}
        Detected Intent: {intent}
        
        Contextual Data:
        - Budget: {inferred_budget}
        - Products: {products}
        - Bank Data: {bank_data}
        - Cart Total: {cart_total}
        - Safety Check: {safety_check_passed}
        
        Generate the final spoken-style response."""),
    ])
    
    return prompt | llm

