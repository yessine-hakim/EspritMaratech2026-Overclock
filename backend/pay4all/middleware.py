
class DebugLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith('/api/'):
            # Safely check for user
            is_auth = getattr(request.user, 'is_authenticated', False) if hasattr(request, 'user') else "N/A (Auth Mid missing)"
            print(f"DEBUG: Middleware - Path: {request.path}")
            print(f"DEBUG: Middleware - Auth: {is_auth}")
            print(f"DEBUG: Middleware - Cookies: {list(request.COOKIES.keys())}")
        
        response = self.get_response(request)
        return response
