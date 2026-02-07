from django.core.management.base import BaseCommand
from products.anomaly_detection import ProductAnomalyDetector, SearchAnomalyDetector
import json
from pathlib import Path

class Command(BaseCommand):
    help = 'Run anomaly detection on product data and search patterns'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--output',
            type=str,
            default='anomaly_report.json',
            help='Output file for anomaly report',
        )
        parser.add_argument(
            '--products',
            action='store_true',
            help='Run product anomaly detection only',
        )
        parser.add_argument(
            '--search',
            action='store_true',
            help='Run search anomaly detection only',
        )
    
    def handle(self, *args, **kwargs):
        output_file = kwargs['output']
        run_products = kwargs['products'] or not kwargs['search']
        run_search = kwargs['search'] or not kwargs['products']
        
        report = {}
        
        # Product anomaly detection
        if run_products:
            self.stdout.write(self.style.WARNING("Running product anomaly detection..."))
            product_detector = ProductAnomalyDetector()
            
            self.stdout.write("  → Detecting pricing anomalies...")
            pricing_anomalies = product_detector.detect_pricing_anomalies()
            
            self.stdout.write("  → Detecting data quality issues...")
            data_anomalies = product_detector.detect_missing_data()
            
            self.stdout.write("  → Detecting duplicate barcodes...")
            duplicate_anomalies = product_detector.detect_duplicate_barcodes()
            
            report['product_anomalies'] = {
                'pricing_anomalies': pricing_anomalies,
                'data_quality_issues': data_anomalies,
                'duplicate_barcodes': duplicate_anomalies,
                'summary': {
                    'total_pricing_anomalies': len(pricing_anomalies),
                    'total_data_quality_issues': len(data_anomalies),
                    'total_duplicate_barcodes': len(duplicate_anomalies)
                }
            }
            
            self.stdout.write(self.style.SUCCESS(
                f"  ✓ Found {len(pricing_anomalies)} pricing anomalies"
            ))
            self.stdout.write(self.style.SUCCESS(
                f"  ✓ Found {len(data_anomalies)} data quality issues"
            ))
            self.stdout.write(self.style.SUCCESS(
                f"  ✓ Found {len(duplicate_anomalies)} duplicate barcode issues"
            ))
        
        # Search anomaly detection
        if run_search:
            self.stdout.write(self.style.WARNING("\nRunning search anomaly detection..."))
            search_detector = SearchAnomalyDetector()
            
            self.stdout.write("  → Detecting zero-result patterns...")
            zero_result_anomalies = search_detector.detect_zero_results_pattern()
            
            self.stdout.write("  → Getting search statistics...")
            search_stats = search_detector.get_search_stats()
            
            report['search_anomalies'] = {
                'zero_result_patterns': zero_result_anomalies,
                'search_statistics': search_stats,
                'summary': {
                    'total_zero_result_patterns': len(zero_result_anomalies)
                }
            }
            
            self.stdout.write(self.style.SUCCESS(
                f"  ✓ Found {len(zero_result_anomalies)} zero-result patterns"
            ))
            self.stdout.write(self.style.SUCCESS(
                f"  ✓ Total searches tracked: {search_stats['total_searches']}"
            ))
            self.stdout.write(self.style.SUCCESS(
                f"  ✓ Zero-result rate: {search_stats['zero_result_rate']}%"
            ))
        
        # Save report
        output_path = Path(output_file)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        self.stdout.write(self.style.SUCCESS(f"\n✓ Report saved to {output_path.absolute()}"))
        
        # Print summary
        self.stdout.write("\n" + "="*60)
        self.stdout.write(self.style.WARNING("ANOMALY DETECTION SUMMARY"))
        self.stdout.write("="*60)
        
        if run_products:
            total_product_issues = (
                len(report['product_anomalies']['pricing_anomalies']) +
                len(report['product_anomalies']['data_quality_issues']) +
                len(report['product_anomalies']['duplicate_barcodes'])
            )
            self.stdout.write(f"Product Issues: {total_product_issues}")
        
        if run_search:
            self.stdout.write(f"Search Issues: {len(report['search_anomalies']['zero_result_patterns'])}")
        
        self.stdout.write("="*60)
