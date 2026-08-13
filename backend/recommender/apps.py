from django.apps import AppConfig

class RecommenderConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'recommender'

    def ready(self):
        # Load signal handlers
        from . import signals

        # Rebuild recommendation data from Neon DB on every startup.
        # If rebuilding fails, Django should still start normally.
        try:
            from .recommender import rebuild_recommendation_data

            print("Starting recommendation data rebuild from database...")
            rebuild_recommendation_data()
            print("Recommendation data rebuild completed successfully.")

        except MemoryError:
            print(
                "WARNING: Recommendation data rebuild ran out of memory. "
                "Skipping rebuild so the application can continue starting."
            )

        except Exception as e:
            print(
                f"WARNING: Recommendation data rebuild failed: {e}. "
                "Skipping rebuild so the application can continue starting."
            )