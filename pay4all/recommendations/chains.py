import os
import json
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
        ("system", """You are Pay4All, a budget-aware shopping assistant.
        You have successfully retrieved a list of products that match the user's query and budget.
        
        Your task is to present these recommendations.
        
        Rules:
        1. Explain WHY these products were chosen, specifically mentioning how they fit the budget and needs.
        2. If alternatives were found (because the original request was over budget), explicitly state this and explain the trade-offs.
        3. Be helpful and encouraging.
        4. Reference the specific products by name and price.
        
        Keep the response concise but informative.
        """),
        ("human", """User Query: {query}
        Inferred Budget: {inferred_budget}
        
        Retrieved Products:
        {products}
        
        Alternatives (if any):
        {alternatives}
        
        Generate the final response."""),
    ])
    
    return prompt | llm

