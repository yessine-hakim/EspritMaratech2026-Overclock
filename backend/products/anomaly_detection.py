from sklearn.ensemble import IsolationForest
import numpy as np
from django.core.cache import cache
from products.models import Product
import logging
from datetime import datetime
from collections import Counter

logger = logging.getLogger(__name__)

class ProductAnomalyDetector:
    """Detect anomalies in product data."""
    
    def __init__(self):
        self.model = IsolationForest(
            contamination=0.05,  # Expect 5% anomalies
            random_state=42
        )
        
    def detect_pricing_anomalies(self):
        """Find products with unusual pricing."""
        products = Product.objects.all()
        
        # Extract features
        features = []
        product_ids = []
        
        for p in products:
            try:
                price = float(p.price.replace(' USD', ''))
                rating = float(p.rating) if p.rating else 0
                nbr_rating = int(p.nbr_rating) if p.nbr_rating else 0
                
                features.append([price, rating, nbr_rating])
                product_ids.append(p.id)
            except:
                continue
        
        if len(features) < 10:
            logger.warning("Not enough products for anomaly detection")
            return []
        
        # Detect anomalies
        X = np.array(features)
        predictions = self.model.fit_predict(X)
        
        # Return anomalous products
        anomalies = []
        for idx, pred in enumerate(predictions):
            if pred == -1:  # Anomaly
                product = Product.objects.get(id=product_ids[idx])
                anomalies.append({
                    'product_id': product_ids[idx],
                    'product_title': product.title,
                    'price': features[idx][0],
                    'rating': features[idx][1],
                    'nbr_rating': features[idx][2],
                    'type': 'pricing_anomaly'
                })
        
        logger.warning(f"Found {len(anomalies)} pricing anomalies")
        return anomalies
    
    def detect_missing_data(self):
        """Find products with missing critical data."""
        anomalies = []
        
        products = Product.objects.all()
        for p in products:
            issues = []
            
            if not p.image and not p.image_urls:
                issues.append('missing_image')
            if not p.description or p.description == "No description available.":
                issues.append('missing_description')
            if not p.category:
                issues.append('missing_category')
            if not p.barcode:
                issues.append('missing_barcode')
            
            if issues:
                anomalies.append({
                    'product_id': p.id,
                    'product_title': p.title,
                    'issues': issues,
                    'type': 'data_quality'
                })
        
        logger.warning(f"Found {len(anomalies)} data quality issues")
        return anomalies
    
    def detect_duplicate_barcodes(self):
        """Find products with duplicate barcodes."""
        from django.db.models import Count
        
        duplicates = Product.objects.values('barcode').annotate(
            count=Count('barcode')
        ).filter(count__gt=1, barcode__isnull=False)
        
        anomalies = []
        for dup in duplicates:
            products = Product.objects.filter(barcode=dup['barcode'])
            anomalies.append({
                'barcode': dup['barcode'],
                'count': dup['count'],
                'product_ids': list(products.values_list('id', flat=True)),
                'product_titles': list(products.values_list('title', flat=True)),
                'type': 'duplicate_barcode'
            })
        
        logger.warning(f"Found {len(anomalies)} duplicate barcode issues")
        return anomalies


class SearchAnomalyDetector:
    """Detect anomalies in search patterns."""
    
    def __init__(self):
        # Use cache for persistent storage across requests
        self.cache_key = 'search_history'
        
    def _get_search_history(self):
        """Get search history from cache."""
        return cache.get(self.cache_key, [])
    
    def _save_search_history(self, history):
        """Save search history to cache."""
        # Keep only last 1000 searches
        if len(history) > 1000:
            history = history[-1000:]
        cache.set(self.cache_key, history, timeout=86400)  # 24 hours
    
    def track_search(self, user_id, query, results_count, timestamp=None):
        """Track search for anomaly detection."""
        if timestamp is None:
            timestamp = datetime.now()
        
        history = self._get_search_history()
        history.append({
            'user_id': user_id,
            'query': query,
            'results_count': results_count,
            'timestamp': timestamp.isoformat()
        })
        self._save_search_history(history)
    
    def detect_bot_behavior(self, user_id):
        """Detect if user exhibits bot-like search patterns."""
        history = self._get_search_history()
        user_searches = [s for s in history if s['user_id'] == user_id]
        
        if len(user_searches) < 10:
            return False
        
        # Check for rapid-fire searches (> 10 searches in 1 minute)
        recent = user_searches[-10:]
        try:
            time_span = (
                datetime.fromisoformat(recent[-1]['timestamp']) - 
                datetime.fromisoformat(recent[0]['timestamp'])
            ).total_seconds()
            
            if time_span < 60:  # 10 searches in < 1 minute
                logger.warning(f"Bot-like behavior detected for user {user_id}")
                return True
        except:
            pass
        
        return False
    
    def detect_zero_results_pattern(self):
        """Detect searches consistently returning zero results."""
        history = self._get_search_history()
        zero_result_queries = [
            s['query'] for s in history 
            if s['results_count'] == 0
        ]
        
        # If same query returns 0 results multiple times, flag it
        query_counts = Counter(zero_result_queries)
        
        anomalies = [
            {'query': q, 'count': c, 'type': 'zero_results'}
            for q, c in query_counts.items() if c >= 3
        ]
        
        return anomalies
    
    def get_search_stats(self):
        """Get overall search statistics."""
        history = self._get_search_history()
        
        if not history:
            return {
                'total_searches': 0,
                'unique_users': 0,
                'avg_results': 0,
                'zero_result_rate': 0
            }
        
        total = len(history)
        unique_users = len(set(s['user_id'] for s in history if s['user_id']))
        avg_results = sum(s['results_count'] for s in history) / total
        zero_results = sum(1 for s in history if s['results_count'] == 0)
        
        return {
            'total_searches': total,
            'unique_users': unique_users,
            'avg_results': round(avg_results, 2),
            'zero_result_rate': round(zero_results / total * 100, 2)
        }
