from django.contrib.auth.models import User
from rest_framework import serializers
import re
from .models import Book, ReadBooks, Wishlist

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "password"]
        extra_kwargs = {"password": {"write_only": True}}

    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError(
                "Password must be at least 8 characters."
            )
        if not re.search(r"[A-Z]", value):
            raise serializers.ValidationError(
                "Password must contain an uppercase letter."
            )
        if not re.search(r"[a-z]", value):
            raise serializers.ValidationError(
                "Password must contain a lowercase letter."
            )
        if not re.search(r"\d", value):
            raise serializers.ValidationError(
                "Password must contain a number."
            )
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", value):
            raise serializers.ValidationError(
                "Password must contain a special character."
            )
        return value
    
    
    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user
    
class BookSerializer(serializers.ModelSerializer):
    class Meta:
        model = Book
        fields = ["id", "isbn", "title"]

class ReadBooksSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReadBooks
        fields = ["id", "user", "book", "rating", "review", "created_at"]
        read_only_fields = ["id", "user", "book", "created_at"]

class WishlistSerializer(serializers.ModelSerializer):
    class Meta:
        model = Wishlist
        fields = ["id", "user", "book", "created_at"]
        read_only_fields = ["id", "user", "book", "created_at"]