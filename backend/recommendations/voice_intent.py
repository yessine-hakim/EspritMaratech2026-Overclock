# ============================================================================
# IMPORTS
# ============================================================================
# Standard library
import os
import json
import logging
from typing import Any, Optional, Dict
from datetime import datetime

# Django
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.core.cache import cache

# Third-party
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field, validator

# Configure logging
logger = logging.getLogger(__name__)

# ============================================================================
# CONSTANTS AND CONFIGURATION
# ============================================================================
CACHE_TIMEOUT = 300  # 5 minutes
CACHE_KEY_PREFIX = "voice_intent:"

# Response templates
RATE_LIMIT_RESPONSE = {
    "action": "chat",
    "target": "general",
    "params": {},
    "value": None,
    "response": "I'm experiencing high usage right now. Please try again in a moment, or use the navigation buttons.",
    "confidence": 1.0
}

ERROR_RESPONSE = {
    "action": "chat",
    "target": "general",
    "params": {},
    "value": None,
    "response": "Sorry, I couldn't process that. Please try again or use the interface buttons.",
    "confidence": 0.0
}

TIMEOUT_RESPONSE = {
    "action": "chat",
    "target": "general",
    "params": {},
    "value": None,
    "response": "The request took too long. Please try again with a simpler command.",
    "confidence": 0.5
}

AUTH_ERROR_RESPONSE = {
    "action": "chat",
    "target": "general",
    "params": {},
    "value": None,
    "response": "There's a configuration issue. Please contact support or use manual navigation.",
    "confidence": 0.0
}

# System prompt
SYSTEM_PROMPT = """You are the AI Voice Brain for Pay4All, an inclusive shopping and banking app.
Convert user voice transcripts into structured JSON commands with confidence scoring.

CONFIDENCE SCORING:
- Include a confidence field (0-1) indicating certainty
- High confidence (>0.8): Clear, unambiguous command with specific action words
- Medium confidence (0.5-0.8): Somewhat clear but alternatives exist or context needed
- Low confidence (<0.5): Unclear, ambiguous, or very vague request

COMPLETE ACTION REFERENCE:

1. AUTH (action='auth')
   - target='login': User wants to log in
   - target='register': User wants to create account
   - target='logout': User wants to log out
   - Extract params: email, password, username when mentioned
   
   Examples:
   - "log out" → action='auth', target='logout', confidence=0.95
   - "sign me out" → action='auth', target='logout', confidence=0.9
   - "I want to leave" → action='auth', target='logout', confidence=0.6

2. NAVIGATE (action='navigate')
   - target: 'home', 'cart', 'banking', 'profile', 'login', 'register', 'results', 'search'
   
   Examples:
   - "go home" → action='navigate', target='home', confidence=0.95
   - "take me to my cart" → action='navigate', target='cart', confidence=0.9
   - "show banking" → action='navigate', target='banking', confidence=0.85
   - "profile page" → action='navigate', target='profile', confidence=0.8
   - "go back" → action='navigate', target='home', confidence=0.6

3. SEARCH (action='search')
   - target: The search query or product category
   - params: Extract category, price_max, price_min, and intent
   
   Category Detection:
   - Look for product names: yogurt, milk, cheese, bread, eggs, juice, butter, etc.
   - Extract to params.category
   
   Price Constraints:
   - Patterns: "under X", "less than X", "below X", "max X" → params.price_max
   - Patterns: "over X", "more than X", "above X", "min X" → params.price_min
   - Extract numeric values and currency
   
   Intent Recognition:
   - "buy", "purchase", "get" → params.intent = 'buy'
   - "show", "browse", "see", "find" → params.intent = 'browse'
   - "compare", "check" → params.intent = 'compare'
   - Default → params.intent = 'search'
   
   Examples:
   - "I want to buy yogurt" → action='search', target='yogurt', params={'category': 'yogurt', 'intent': 'buy'}, confidence=0.9
   - "yogurt under 50 dinars" → action='search', target='yogurt', params={'category': 'yogurt', 'price_max': 50}, confidence=0.95
   - "show me milk products" → action='search', target='milk', params={'category': 'milk', 'intent': 'browse'}, confidence=0.85
   - "bread less than 20" → action='search', target='bread', params={'category': 'bread', 'price_max': 20}, confidence=0.9
   - "find cheese between 50 and 100" → action='search', target='cheese', params={'category': 'cheese', 'price_min': 50, 'price_max': 100}, confidence=0.95

4. CART (action='cart')
   - target='add': Add product to cart (extract productId, quantity if mentioned)
   - target='remove': Remove from cart (extract productId if mentioned)
   - target='view': View cart contents
   - target='clear': Clear entire cart
   - target='checkout': Proceed to checkout
   
   Examples:
   - "add to cart" → action='cart', target='add', confidence=0.8
   - "add 2 of these" → action='cart', target='add', params={'quantity': 2}, confidence=0.85
   - "remove this" → action='cart', target='remove', confidence=0.75
   - "show my cart" → action='cart', target='view', confidence=0.95
   - "clear cart" → action='cart', target='clear', confidence=0.9
   - "checkout" → action='cart', target='checkout', confidence=0.95

5. BANKING (action='banking')
   - target='balance': Check account balance
   - target='transactions': View transaction history
   - target='transfer': Transfer money (extract recipient and amount)
   - target='budget': Check budget status
   
   Examples:
   - "check my balance" → action='banking', target='balance', confidence=0.95
   - "show transactions" → action='banking', target='transactions', confidence=0.9
   - "my budget" → action='banking', target='budget', confidence=0.85

6. STATUS_CHECK (action='status_check')
   - target='affordability': "Can I afford this?"
   - target='budget_status': "How is my budget?"
   - target='cart_status': "What's in my cart?"
   - target='account_status': "Account overview"
   
   Examples:
   - "can I afford this" → action='status_check', target='affordability', confidence=0.9
   - "how's my budget" → action='status_check', target='budget_status', confidence=0.85
   - "what's in my cart" → action='status_check', target='cart_status', confidence=0.9

7. CONFIRM (action='confirm')
   - Responses: "yes", "yeah", "yep", "confirm", "ok", "okay", "proceed", "sure", "correct"
   - target='generic'
   
   Examples:
   - "yes" → action='confirm', target='generic', confidence=0.95
   - "yeah do it" → action='confirm', target='generic', confidence=0.9

8. CANCEL (action='cancel')
   - Responses: "no", "nope", "cancel", "stop", "nevermind", "go back", "abort"
   - target='generic'
   
   Examples:
   - "no" → action='cancel', target='generic', confidence=0.95
   - "cancel that" → action='cancel', target='generic', confidence=0.9

9. HELP (action='help')
   - target='general': User asking for help or available commands
   - target='specific': Help with specific feature (extract to params.topic)
   
   Examples:
   - "help" → action='help', target='general', confidence=0.95
   - "what can you do" → action='help', target='general', confidence=0.9
   - "how do I search" → action='help', target='specific', params={'topic': 'search'}, confidence=0.85

10. CHAT (action='chat')
    - target='general': General questions or conversation
    - Use for unclear or conversational inputs
    
    Examples:
    - "hello" → action='chat', target='general', confidence=0.7
    - "how are you" → action='chat', target='general', confidence=0.8

PARAMETER EXTRACTION RULES:
- Extract numbers, product names, emails, amounts from transcript
- Put them in params dict with descriptive keys
- Example: "add 2 milk" → params={'productName': 'milk', 'quantity': 2}
- Always include units for prices (TND, dinars, etc.)
- Extract selection indices: "the first one" → params={'selection': 0}

FOLLOW-UP DETECTION:
- Single word responses like "yes", "no" → confirm/cancel with high confidence
- "the first one", "number 2", "second" → params with selection index
- Context-dependent responses should have medium confidence

OUTPUT FORMAT:
- Return ONLY valid JSON
- Include all required fields: action, target, params, value, response, confidence
- Keep response field concise and friendly
- Ensure confidence reflects actual certainty
"""

# ============================================================================
# PYDANTIC MODELS
# ============================================================================
class VoiceIntentOutput(BaseModel):
    """
    Structured output for voice intent classification.
    
    Attributes:
        action: Primary action type (auth, navigate, search, cart, banking, etc.)
        target: Specific target for the action
        params: Optional parameters dictionary
        value: Optional value for the action
        response: User-friendly verbal confirmation
        confidence: Confidence score (0-1) for the classification
    """
    action: str = Field(
        description="Primary action: auth, navigate, search, cart, banking, status_check, confirm, cancel, help, chat"
    )
    target: str = Field(
        description="Specific target (e.g., 'login', 'balance', 'add', 'home')"
    )
    params: Optional[Dict[str, Any]] = Field(
        description="Action parameters (e.g., {productId: 123, quantity: 2})",
        default_factory=dict
    )
    value: Any = Field(
        description="Optional value for the action",
        default=None
    )
    response: str = Field(
        description="Friendly verbal confirmation for the user"
    )
    confidence: Optional[float] = Field(
        description="Confidence score (0-1) for the classification",
        default=0.8,
        ge=0.0,
        le=1.0
    )
    
    @validator('params', pre=True, always=True)
    def ensure_params_dict(cls, v):
        """Ensure params is always a dictionary."""
        if v is None:
            return {}
        if isinstance(v, dict):
            return v
        logger.warning(f"Invalid params type: {type(v)}, converting to empty dict")
        return {}
    
    @validator('action')
    def validate_action(cls, v):
        """Validate action is in the allowed set."""
        valid_actions = {
            'auth', 'navigate', 'search', 'cart', 'banking',
            'status_check', 'confirm', 'cancel', 'help', 'chat'
        }
        if v not in valid_actions:
            logger.warning(f"Invalid action '{v}', defaulting to 'chat'")
            return 'chat'
        return v
    
    @validator('confidence', pre=True, always=True)
    def ensure_confidence_range(cls, v):
        """Ensure confidence is within valid range."""
        if v is None:
            return 0.8
        try:
            conf = float(v)
            return max(0.0, min(1.0, conf))
        except (ValueError, TypeError):
            logger.warning(f"Invalid confidence value: {v}, defaulting to 0.8")
            return 0.8

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================
def get_cached_intent(transcript: str) -> Optional[Dict[str, Any]]:
    """
    Get cached intent result for a transcript.
    
    Args:
        transcript: The user's voice transcript
        
    Returns:
        Cached result dictionary or None if not found
    """
    cache_key = f"{CACHE_KEY_PREFIX}{transcript.lower().strip()}"
    cached = cache.get(cache_key)
    
    if cached:
        logger.info(f"Cache hit for transcript: '{transcript[:50]}...'")
    else:
        logger.info(f"Cache miss for transcript: '{transcript[:50]}...'")
    
    return cached


def cache_intent(transcript: str, result: Dict[str, Any]) -> None:
    """
    Cache intent result for a transcript.
    
    Args:
        transcript: The user's voice transcript
        result: The intent classification result to cache
    """
    cache_key = f"{CACHE_KEY_PREFIX}{transcript.lower().strip()}"
    cache.set(cache_key, result, CACHE_TIMEOUT)
    logger.info(f"Cached result for transcript: '{transcript[:50]}...'")


def sanitize_transcript(transcript: str) -> str:
    """
    Clean and sanitize user transcript.
    
    Removes excessive whitespace and common filler words.
    
    Args:
        transcript: Raw transcript from speech recognition
        
    Returns:
        Cleaned transcript string
    """
    # Remove excessive whitespace
    transcript = ' '.join(transcript.split())
    
    # Remove common filler words
    filler_words = ['um', 'uh', 'like', 'you know', 'sort of', 'kind of']
    words = transcript.split()
    words = [w for w in words if w.lower() not in filler_words]
    
    cleaned = ' '.join(words).strip()
    logger.debug(f"Sanitized transcript: '{transcript}' → '{cleaned}'")
    
    return cleaned


def create_llm_chain():
    """
    Create and configure the LLM processing chain.
    
    Returns:
        Configured LangChain chain for intent classification
        
    Raises:
        ValueError: If GROQ_API_KEY is not configured
    """
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        logger.error("GROQ_API_KEY environment variable not found")
        raise ValueError("GROQ_API_KEY not found in environment")
    
    llm = ChatGroq(
        temperature=0,
        model_name="llama-3.3-70b-versatile",
        groq_api_key=api_key,
        max_retries=2,
        request_timeout=10
    )
    
    parser = JsonOutputParser(pydantic_object=VoiceIntentOutput)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        ("human", "User said: {transcript}"),
    ])
    
    chain = prompt | llm | parser
    logger.debug("LLM chain created successfully")
    
    return chain


def handle_llm_error(error: Exception) -> JsonResponse:
    """
    Handle LLM-specific errors and return appropriate response.
    
    Args:
        error: The exception raised during LLM processing
        
    Returns:
        JsonResponse with appropriate error message
    """
    error_str = str(error).lower()
    
    # Rate limit errors
    if "rate_limit" in error_str or "429" in error_str:
        logger.warning(f"Rate limit hit for Groq API: {error}")
        return JsonResponse(RATE_LIMIT_RESPONSE)
    
    # Timeout errors
    if "timeout" in error_str or "timed out" in error_str:
        logger.warning(f"Request timeout: {error}")
        return JsonResponse(TIMEOUT_RESPONSE)
    
    # Authentication errors
    if "401" in error_str or "403" in error_str or "unauthorized" in error_str:
        logger.error(f"Authentication error: {error}")
        return JsonResponse(AUTH_ERROR_RESPONSE)
    
    # Generic LLM error
    logger.error(f"LLM processing error: {error}", exc_info=True)
    return JsonResponse(ERROR_RESPONSE)


def enrich_with_user_data(result: Dict[str, Any], request) -> Dict[str, Any]:
    """
    Enrich intent result with real user data.
    
    Args:
        result: The intent classification result
        request: Django request object
        
    Returns:
        Enriched result dictionary
    """
    action = result.get('action')
    target = result.get('target')
    
    # Enrich status checks
    if action == 'status_check':
        result = _enrich_status_check(result, request)
    
    # Enrich banking balance
    elif action == 'banking' and target == 'balance':
        result = _enrich_balance_check(result, request)
    
    # Enrich banking budget
    elif action == 'banking' and target == 'budget':
        result = _enrich_budget_check(result, request)
    
    return result


def _enrich_status_check(result: Dict[str, Any], request) -> Dict[str, Any]:
    """
    Enrich status check with real user data.
    
    Args:
        result: The intent result to enrich
        request: Django request object
        
    Returns:
        Enriched result with user data
    """
    try:
        from cart.models import Cart
        from banking.models import BankAccount

        target = result.get('target')
        params = result.get('params', {})

        if target == 'affordability':
            # Get cart total and balance
            cart = Cart.objects.filter(user=request.user, is_active=True).first()
            account = BankAccount.objects.filter(user=request.user).first()
            
            if cart and account:
                cart_total = float(cart.total_price)
                balance = float(account.balance)
                can_afford = balance >= cart_total
                shortage = cart_total - balance if not can_afford else 0
                
                params.update({
                    'amount': round(cart_total, 2),
                    'balance': round(balance, 2),
                    'canAfford': can_afford,
                    'shortage': round(shortage, 2) if shortage > 0 else 0
                })
                
                if can_afford:
                    result['response'] = (
                        f"Yes, you can afford this. Your balance is {balance:.2f} TND "
                        f"and your cart total is {cart_total:.2f} TND."
                    )
                else:
                    result['response'] = (
                        f"No, you cannot afford this. Your balance is {balance:.2f} TND "
                        f"but your cart is {cart_total:.2f} TND. You are short by {shortage:.2f} TND."
                    )
            else:
                result['response'] = "Unable to check affordability. Please ensure you have a cart and bank account."

        elif target == 'budget_status':
            # Get budget info
            account = BankAccount.objects.filter(user=request.user).first()
            if account:
                balance = float(account.balance)
                monthly_budget = float(account.monthly_budget)
                percent_remaining = (balance / monthly_budget * 100) if monthly_budget > 0 else 0
                amount_spent = monthly_budget - balance
                
                params.update({
                    'balance': round(balance, 2),
                    'monthly_budget': round(monthly_budget, 2),
                    'percent_remaining': round(percent_remaining, 1),
                    'amount_spent': round(amount_spent, 2)
                })
                
                result['response'] = (
                    f"Your monthly budget is {monthly_budget:.2f} TND. "
                    f"You have {balance:.2f} TND remaining ({percent_remaining:.1f}%). "
                    f"You've spent {amount_spent:.2f} TND so far."
                )
            else:
                result['response'] = "No bank account found. Please set up your account first."

        elif target == 'cart_status':
            # Get cart info
            cart = Cart.objects.filter(user=request.user, is_active=True).first()
            if cart:
                item_count = cart.items.count()
                total = float(cart.total_price)
                
                params.update({
                    'item_count': item_count,
                    'total': round(total, 2)
                })
                
                result['response'] = (
                    f"You have {item_count} item(s) in your cart. "
                    f"Total: {total:.2f} TND."
                )
            else:
                result['response'] = "Your cart is empty."
        
        result['params'] = params

    except Exception as e:
        logger.error(f"Error enriching status check: {e}", exc_info=True)
        result['response'] = "Unable to retrieve status information at this time."

    return result


def _enrich_balance_check(result: Dict[str, Any], request) -> Dict[str, Any]:
    """
    Enrich balance check with real data.
    
    Args:
        result: The intent result to enrich
        request: Django request object
        
    Returns:
        Enriched result with balance data
    """
    try:
        from banking.models import BankAccount
        
        account = BankAccount.objects.filter(user=request.user).first()
        params = result.get('params', {})
        
        if account:
            balance = float(account.balance)
            params['balance'] = round(balance, 2)
            result['response'] = f"Your current balance is {balance:.2f} TND."
        else:
            result['response'] = "No bank account found. Please set up your account first."
        
        result['params'] = params
        
    except Exception as e:
        logger.error(f"Error enriching balance check: {e}", exc_info=True)
        result['response'] = "Unable to retrieve balance information at this time."

    return result


def _enrich_budget_check(result: Dict[str, Any], request) -> Dict[str, Any]:
    """
    Enrich budget check with real data.
    
    Args:
        result: The intent result to enrich
        request: Django request object
        
    Returns:
        Enriched result with budget data
    """
    try:
        from banking.models import BankAccount
        
        account = BankAccount.objects.filter(user=request.user).first()
        params = result.get('params', {})
        
        if account:
            balance = float(account.balance)
            monthly_budget = float(account.monthly_budget)
            percent_remaining = (balance / monthly_budget * 100) if monthly_budget > 0 else 0
            
            params.update({
                'balance': round(balance, 2),
                'monthly_budget': round(monthly_budget, 2),
                'percent_remaining': round(percent_remaining, 1)
            })
            
            result['response'] = (
                f"Your monthly budget is {monthly_budget:.2f} TND. "
                f"You have {balance:.2f} TND remaining ({percent_remaining:.1f}%)."
            )
        else:
            result['response'] = "No bank account found. Please set up your account first."
        
        result['params'] = params
        
    except Exception as e:
        logger.error(f"Error enriching budget check: {e}", exc_info=True)
        result['response'] = "Unable to retrieve budget information at this time."

    return result


# ============================================================================
# MAIN VIEW
# ============================================================================
@csrf_exempt
@require_http_methods(["POST"])
def classify_voice_intent(request):
    """
    Main endpoint for voice intent classification.
    
    This endpoint receives a voice transcript and classifies it into a structured
    intent with action, target, parameters, and a user-friendly response.
    
    Request Body (JSON):
        {
            "transcript": "user's voice command as text"
        }
    
    Response (JSON):
        {
            "action": "primary action type",
            "target": "specific target",
            "params": {"key": "value"},
            "value": null or any value,
            "response": "user-friendly confirmation message",
            "confidence": 0.0-1.0,
            "_metadata": {
                "transcript": "original transcript",
                "timestamp": "ISO timestamp",
                "cached": true/false
            }
        }
    
    Features:
        - Input sanitization and validation
        - Caching for improved performance
        - Comprehensive error handling
        - User data enrichment
        - Confidence scoring
        - Detailed logging
    
    Returns:
        JsonResponse with classified intent or error message
    """
    cached_result = False
    transcript_original = ""
    
    try:
        # 1. Parse JSON request
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError as e:
            logger.warning(f"Invalid JSON in request: {e}")
            return JsonResponse({
                "error": "Invalid JSON format",
                "action": "chat",
                "target": "error",
                "params": {},
                "response": "Sorry, I couldn't understand the request format.",
                "confidence": 0.0
            }, status=200)
        
        # 2. Validate transcript exists
        transcript_original = data.get("transcript", "").strip()
        if not transcript_original:
            logger.warning("Empty transcript received")
            return JsonResponse({
                "error": "No transcript provided",
                "action": "chat",
                "target": "error",
                "params": {},
                "response": "I didn't hear anything. Please try speaking again.",
                "confidence": 0.0
            }, status=200)
        
        logger.info(f"Processing transcript: '{transcript_original[:100]}...'")
        
        # 3. Sanitize transcript
        transcript = sanitize_transcript(transcript_original)
        
        if not transcript:
            logger.warning("Transcript empty after sanitization")
            return JsonResponse({
                "error": "Empty transcript after cleaning",
                "action": "chat",
                "target": "error",
                "params": {},
                "response": "I couldn't understand that. Please try again.",
                "confidence": 0.0
            }, status=200)
        
        # 4. Check cache
        cached = get_cached_intent(transcript)
        if cached:
            cached_result = True
            result = cached
            logger.info("Returning cached result")
        else:
            # 5. Process with LLM if not cached
            try:
                chain = create_llm_chain()
                result = chain.invoke({"transcript": transcript})
                
                # Ensure params is a dict
                if result.get('params') is None:
                    result['params'] = {}
                
                logger.info(f"LLM classified intent: action={result.get('action')}, target={result.get('target')}, confidence={result.get('confidence')}")
                
            except Exception as llm_error:
                return handle_llm_error(llm_error)
        
        # 6. Enrich with user data (if authenticated)
        if request.user and request.user.is_authenticated:
            try:
                result = enrich_with_user_data(result, request)
                logger.debug("Result enriched with user data")
            except Exception as enrich_error:
                logger.error(f"Error enriching result: {enrich_error}", exc_info=True)
                # Continue with unenriched result
        
        # 7. Cache successful result (if not already cached)
        if not cached_result:
            try:
                cache_intent(transcript, result)
            except Exception as cache_error:
                logger.warning(f"Failed to cache result: {cache_error}")
                # Continue without caching
        
        # 8. Add metadata
        result['_metadata'] = {
            'transcript': transcript_original,
            'timestamp': datetime.now().isoformat(),
            'cached': cached_result
        }
        
        # 9. Return JSON response
        logger.info(f"Successfully processed intent: {result.get('action')}/{result.get('target')}")
        return JsonResponse(result)
        
    except Exception as e:
        logger.error(f"Unexpected error in classify_voice_intent: {e}", exc_info=True)
        return JsonResponse({
            "action": "chat",
            "target": "error",
            "params": {},
            "value": None,
            "response": "Sorry, something went wrong. Please try again or use the navigation buttons.",
            "confidence": 0.0,
            "_metadata": {
                "transcript": transcript_original,
                "timestamp": datetime.now().isoformat(),
                "error": str(e)
            }
        }, status=200)  # Return 200 to avoid breaking voice flow


# ============================================================================
# UTILITY ENDPOINTS
# ============================================================================
@csrf_exempt
@require_http_methods(["GET"])
def voice_intent_health(request):
    """
    Health check endpoint for voice intent service.
    
    Returns service status and configuration information.
    
    Response (JSON):
        {
            "status": "healthy" or "degraded",
            "api_configured": true/false,
            "cache_available": true/false,
            "timestamp": "ISO timestamp"
        }
    """
    api_key = os.environ.get("GROQ_API_KEY")
    cache_available = True
    
    try:
        # Test cache
        test_key = f"{CACHE_KEY_PREFIX}health_check"
        cache.set(test_key, "test", 10)
        cache.get(test_key)
        cache.delete(test_key)
    except Exception as e:
        logger.warning(f"Cache health check failed: {e}")
        cache_available = False
    
    status = "healthy" if (api_key and cache_available) else "degraded"
    
    return JsonResponse({
        "status": status,
        "api_configured": bool(api_key),
        "cache_available": cache_available,
        "timestamp": datetime.now().isoformat()
    })


@csrf_exempt
@require_http_methods(["POST"])
def clear_voice_cache(request):
    """
    Clear voice intent cache (admin only).
    
    Requires staff/admin privileges.
    
    Response (JSON):
        {
            "status": "Cache cleared" or error message,
            "timestamp": "ISO timestamp"
        }
    """
    if not request.user.is_authenticated or not request.user.is_staff:
        logger.warning(f"Unauthorized cache clear attempt by user: {request.user}")
        return JsonResponse({
            "error": "Unauthorized",
            "message": "Only administrators can clear the cache."
        }, status=403)
    
    try:
        # Django cache doesn't have delete_pattern by default
        # This is a simple implementation - for production, use Redis with delete_pattern
        cache.clear()
        logger.info(f"Cache cleared by user: {request.user}")
        
        return JsonResponse({
            "status": "Cache cleared successfully",
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Error clearing cache: {e}", exc_info=True)
        return JsonResponse({
            "error": "Failed to clear cache",
            "message": str(e)
        }, status=500)
