from django.contrib.auth.models import User
from rest_framework import generics
from .serializers import UserSerializer, BookSerializer
from .models import Book
from rest_framework.permissions import AllowAny, IsAuthenticated

class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

class ReadBookView(generics.ListAPIView):
    
    serializer_class = BookSerializer
    # permission_classes = [IsAuthenticated]
    permission_classes = [AllowAny]

    def get_queryset(self):
        query = self.request.query_params.get("q", "").strip()

        if not query:
            return Book.objects.none()

        return Book.objects.filter(
            title__icontains = query
        )[:10]