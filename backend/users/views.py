from django.contrib.auth import login, logout
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_protect
from django.middleware.csrf import get_token
from rest_framework import generics, permissions, status, views
from rest_framework.response import Response
from .serializers import UserRegistrationSerializer, UserSerializer, LoginSerializer
from .transcription import transcribe_audio

# Keep existing Function Based Views if needed for backward compatibility or direct access, 
# but for the React migration we focus on these API Views.

class RegisterAPIView(generics.CreateAPIView):
    serializer_class = UserRegistrationSerializer
    permission_classes = (permissions.AllowAny,)

    def perform_create(self, serializer):
        # Serializer handles creation and bank account linking
        user = serializer.save()
        login(self.request, user)

class LoginAPIView(views.APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data
        login(request, user)
        return Response(UserSerializer(user).data)

class LogoutAPIView(views.APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_200_OK)

class CheckSessionView(views.APIView):
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        if request.user.is_authenticated:
            # We assume user already has a bank account from registration
            return Response(UserSerializer(request.user).data)
        return Response({'isAuthenticated': False, 'details': 'User is Anonymous'}, status=status.HTTP_401_UNAUTHORIZED)

@method_decorator(ensure_csrf_cookie, name='dispatch')
class GetCSRFToken(views.APIView):
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        return Response({'csrfToken': get_token(request)})

class TranscribeAPIView(views.APIView):
    permission_classes = (permissions.AllowAny,) # Or IsAuthenticated depending on need

    def post(self, request):
        if 'audio' not in request.FILES:
            return Response({'error': 'No audio file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        audio_file = request.FILES['audio']
        try:
            text = transcribe_audio(audio_file)
            if text:
                return Response({'text': text})
            else:
                return Response({'error': 'Transcription failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            print(f"Transcription error: {e}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ProfileUpdateAPIView(generics.UpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self):
        return self.request.user

class UpdateBankAccountAPIView(views.APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        new_iban = request.data.get('iban')
        if not new_iban:
            return Response({'error': 'IBAN is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        from banking.models import BankAccount
        try:
            # Check if new IBAN exists and is unclaimed
            new_account = BankAccount.objects.get(iban=new_iban)
            if new_account.user is not None:
                 # Check if it's already the user's account
                if new_account.user == request.user:
                     return Response({'message': 'This is already your linked account.'}, status=status.HTTP_200_OK)
                return Response({'error': 'This IBAN is already linked to another user.'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Unlink old account
            old_account = BankAccount.objects.filter(user=request.user).first()
            if old_account:
                old_account.user = None
                old_account.save()
            
            # Link new account
            new_account.user = request.user
            new_account.save()
            
            return Response({'message': 'Bank account updated successfully', 'iban': new_iban}, status=status.HTTP_200_OK)
            
        except BankAccount.DoesNotExist:
            return Response({'error': 'Invalid IBAN. Account not found.'}, status=status.HTTP_404_NOT_FOUND)
