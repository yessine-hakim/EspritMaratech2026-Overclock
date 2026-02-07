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
            Your job is to convert a user's voice transcript into a structured JSON command for the frontend.

            VALID ACTIONS & TARGETS:
            1. Action: 'navigate'
               Targets: 'home', 'cart', 'banking', 'profile', 'login'
            2. Action: 'search'
               Target: The search query string (e.g., 'blue shoes')
            3. Action: 'accessibility'
               Targets: 'highContrast', 'fontSize', 'simplifiedMode', 'readabilityMode', 'grayscale', 'visualAlerts', 'focusMode'
               Value: true/false for toggles, or a number (100, 150, 200, 300, 400) for fontSize.
            4. Action: 'banking'
               Targets: 'balance', 'transactions'
            5. Action: 'chat'
               Target: 'general' (For general questions or conversation)

            Output valid JSON only."""),
            ("human", "User said: {transcript}"),
        ])

        chain = prompt | llm | parser
        result = chain.invoke({"transcript": transcript})

        return JsonResponse(result)

    except Exception as e:
        print(f"Voice Intent AI Error: {e}")
        return JsonResponse({"error": str(e)}, status=500)
