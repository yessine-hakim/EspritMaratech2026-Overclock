import json
import os
import glob
import time
from django.core.management.base import BaseCommand
from products.models import Category, Product

try:
    from deep_translator import GoogleTranslator
    TRANSLATOR_AVAILABLE = True
except ImportError:
    TRANSLATOR_AVAILABLE = False


class Command(BaseCommand):
    help = 'Translate JSON files from French to English, rename them, and import to database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--skip-translation',
            action='store_true',
            help='Skip translation (use existing English files)',
        )
        parser.add_argument(
            '--skip-rename',
            action='store_true',
            help='Skip renaming files',
        )
        parser.add_argument(
            '--skip-import',
            action='store_true',
            help='Skip database import',
        )
        parser.add_argument(
            '--translate-only',
            action='store_true',
            help='Only translate files, do not rename or import',
        )

    def handle(self, *args, **options):
        if not TRANSLATOR_AVAILABLE:
            self.stdout.write(self.style.ERROR(
                'deep-translator library not installed. Install it with: pip install deep-translator'
            ))
            return

        # Get the path to the data folder
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        data_dir = os.path.join(base_dir, 'data')
        
        if not os.path.exists(data_dir):
            self.stdout.write(self.style.ERROR(f'Data directory not found: {data_dir}'))
            return
        
        self.stdout.write(self.style.WARNING('Starting translation and import process...'))
        
        # Step 1: Translate JSON files
        if not options['skip_translation'] and not options['translate_only']:
            self.translate_json_files(data_dir)
        elif options['translate_only']:
            self.translate_json_files(data_dir)
            return
        
        # Step 2: Rename files based on translated categories
        if not options['skip_rename']:
            self.rename_files_by_category(data_dir)
        
        # Step 3: Import to database
        if not options['skip_import']:
            self.import_categories(data_dir)
            self.import_products(data_dir)
        
        self.stdout.write(self.style.SUCCESS('Process completed successfully!'))

    def translate_json_files(self, data_dir):
        """Translate all JSON files from French to English"""
        self.stdout.write('Translating JSON files from French to English...')
        
        json_files = glob.glob(os.path.join(data_dir, '*.json'))
        translator = GoogleTranslator(source='fr', target='en')
        
        # Category translation mapping
        category_translations = {
            'high tech': 'electronics',
            'parfum': 'perfume',
            'accessoires': 'accessories',
            'vetement sport': 'sportswear',
            'airpods': 'airpods',
            'smartwatch': 'smartwatch',
            'tablette': 'tablet',
            'ordinateur': 'computer',
            'pc': 'computer'
        }
        
        translated_count = 0
        errors = 0
        
        for json_file in json_files:
            filename = os.path.basename(json_file)
            
            # Skip if already translated (contains _en or ends with _english)
            if '_en' in filename or filename.endswith('_english.json'):
                self.stdout.write(f'  Skipping {filename} (already translated)')
                continue
            
            self.stdout.write(f'  Translating {filename}...')
            
            try:
                translated_lines = []
                line_count = 0
                
                with open(json_file, 'r', encoding='utf-8') as f:
                    for line_num, line in enumerate(f, 1):
                        line = line.strip()
                        if not line:
                            translated_lines.append('')
                            continue
                        
                        try:
                            product_data = json.loads(line)
                            line_count += 1
                            
                            # Translate title
                            if product_data.get('title'):
                                try:
                                    product_data['title'] = translator.translate(product_data['title'])
                                    time.sleep(0.1)  # Rate limiting
                                except Exception as e:
                                    self.stdout.write(
                                        self.style.WARNING(f'    Warning: Could not translate title on line {line_num}: {str(e)}')
                                    )
                            
                            # Translate description
                            if product_data.get('description'):
                                try:
                                    product_data['description'] = translator.translate(product_data['description'])
                                    time.sleep(0.1)  # Rate limiting
                                except Exception as e:
                                    self.stdout.write(
                                        self.style.WARNING(f'    Warning: Could not translate description on line {line_num}: {str(e)}')
                                    )
                            
                            # Translate category
                            if product_data.get('categorie'):
                                original_cat = product_data['categorie'].lower().strip()
                                # Use mapping or translate
                                if original_cat in category_translations:
                                    product_data['categorie'] = category_translations[original_cat]
                                else:
                                    try:
                                        product_data['categorie'] = translator.translate(original_cat).lower()
                                        time.sleep(0.1)
                                    except Exception:
                                        product_data['categorie'] = original_cat  # Keep original if translation fails
                            
                            translated_lines.append(json.dumps(product_data, ensure_ascii=False))
                            
                            if line_count % 10 == 0:
                                self.stdout.write(f'    Translated {line_count} products...')
                        
                        except json.JSONDecodeError:
                            translated_lines.append(line)  # Keep original if not valid JSON
                        except Exception as e:
                            self.stdout.write(
                                self.style.WARNING(f'    Error on line {line_num}: {str(e)}')
                            )
                            translated_lines.append(line)  # Keep original on error
                
                # Write translated content to new file
                base_name = os.path.splitext(filename)[0]
                new_filename = f"{base_name}_en.json"
                new_path = os.path.join(data_dir, new_filename)
                
                with open(new_path, 'w', encoding='utf-8') as f:
                    for line in translated_lines:
                        f.write(line + '\n')
                
                translated_count += 1
                self.stdout.write(f'    [+] Translated {line_count} products -> {new_filename}')
                
                # Add delay between files to avoid rate limiting
                time.sleep(1)
            
            except Exception as e:
                errors += 1
                self.stdout.write(
                    self.style.ERROR(f'  [!] Error translating {filename}: {str(e)}')
                )
        
        self.stdout.write(self.style.SUCCESS(
            f'[+] Translated {translated_count} file(s) ({errors} errors)'
        ))

    def rename_files_by_category(self, data_dir):
        """Rename translated files based on their categories"""
        self.stdout.write('Renaming files based on translated categories...')
        
        json_files = glob.glob(os.path.join(data_dir, '*_en.json'))
        rename_plan = []
        
        for json_file in json_files:
            filename = os.path.basename(json_file)
            category = self.detect_category(json_file)
            
            if category:
                # Create new filename based on category
                category_safe = category.replace(' ', '_').lower()
                new_filename = f"{category_safe}_en.json"
                new_path = os.path.join(data_dir, new_filename)
                
                # If file already exists and it's different, add suffix
                if os.path.exists(new_path) and new_path != json_file:
                    base_name = category_safe
                    counter = 1
                    while os.path.exists(new_path):
                        new_filename = f"{base_name}_{counter}_en.json"
                        new_path = os.path.join(data_dir, new_filename)
                        counter += 1
                
                if new_path != json_file:
                    rename_plan.append((json_file, new_path, category))
                    self.stdout.write(f'  {filename} -> {os.path.basename(new_path)} (category: {category})')
                else:
                    self.stdout.write(f'  {filename} - already correctly named (category: {category})')
            else:
                self.stdout.write(
                    self.style.WARNING(f'  {filename} - could not determine category, skipping')
                )
        
        if not rename_plan:
            self.stdout.write(self.style.SUCCESS('No files need to be renamed.'))
            return
        
        self.stdout.write(f'\nRenaming {len(rename_plan)} file(s)...')
        renamed = 0
        errors = 0
        
        for old_path, new_path, category in rename_plan:
            try:
                if os.path.exists(new_path) and new_path != old_path:
                    self.stdout.write(
                        self.style.WARNING(f'  Target exists: {os.path.basename(new_path)}, skipping')
                    )
                    errors += 1
                    continue
                
                os.rename(old_path, new_path)
                renamed += 1
                self.stdout.write(f'  [+] Renamed: {os.path.basename(old_path)} -> {os.path.basename(new_path)}')
            except Exception as e:
                errors += 1
                self.stdout.write(
                    self.style.ERROR(f'  [!] Error renaming {os.path.basename(old_path)}: {str(e)}')
                )
        
        self.stdout.write(self.style.SUCCESS(
            f'[+] Renamed {renamed} file(s) ({errors} errors)'
        ))

    def detect_category(self, json_file):
        """Detect the category from a JSON file"""
        categories_found = set()
        
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                for i, line in enumerate(f):
                    if i >= 10:  # Check first 10 products
                        break
                    
                    line = line.strip()
                    if not line:
                        continue
                    
                    try:
                        product_data = json.loads(line)
                        if 'categorie' in product_data:
                            categorie = product_data.get('categorie', '').strip()
                            if categorie:
                                categories_found.add(categorie)
                    except json.JSONDecodeError:
                        continue
            
            if categories_found:
                return list(categories_found)[0]
            return None
            
        except Exception as e:
            self.stdout.write(
                self.style.WARNING(f'Error reading {os.path.basename(json_file)}: {str(e)}')
            )
            return None

    def import_categories(self, data_dir):
        """Extract unique categories from translated JSON files and create Category objects"""
        self.stdout.write('Importing categories from translated JSON files...')
        
        categories_found = set()
        json_files = glob.glob(os.path.join(data_dir, '*_en.json'))
        
        for json_file in json_files:
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    for line in f:
                        line = line.strip()
                        if not line:
                            continue
                        try:
                            product_data = json.loads(line)
                            categorie = product_data.get('categorie', '').strip()
                            if categorie:
                                categories_found.add(categorie)
                        except json.JSONDecodeError:
                            continue
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'  Error reading {os.path.basename(json_file)}: {str(e)}'))
        
        self.stdout.write(f'Found {len(categories_found)} unique categories')
        
        categories_created = 0
        for category_name in sorted(categories_found):
            category, created = Category.objects.get_or_create(
                name=category_name,
                defaults={
                    'description': f'Products in the {category_name} category'
                }
            )
            if created:
                categories_created += 1
                self.stdout.write(f'  [+] Created category: {category_name}')
        
        self.stdout.write(self.style.SUCCESS(
            f'[+] Created {categories_created} new categories ({len(categories_found) - categories_created} already existed)'
        ))

    def import_products(self, data_dir):
        """Import products from translated JSON files"""
        self.stdout.write('Importing products from translated JSON files...')
        
        json_files = glob.glob(os.path.join(data_dir, '*_en.json'))
        products_created = 0
        products_updated = 0
        errors = 0
        
        for json_file in json_files:
            self.stdout.write(f'  Processing {os.path.basename(json_file)}...')
            file_created = 0
            file_errors = 0
            
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    for line_num, line in enumerate(f, 1):
                        line = line.strip()
                        if not line:
                            continue
                        
                        try:
                            product_data = json.loads(line)
                            
                            # Get product title
                            title = product_data.get('title', '').strip()
                            if not title:
                                file_errors += 1
                                continue
                            
                            category = None
                            categorie_name = product_data.get('categorie', '').strip()
                            if categorie_name:
                                try:
                                    category = Category.objects.get(name=categorie_name)
                                except Category.DoesNotExist:
                                    self.stdout.write(
                                        self.style.WARNING(
                                            f'  Category "{categorie_name}" not found for product "{title[:50]}...", skipping...'
                                        )
                                    )
                                    file_errors += 1
                                    continue
                            
                            # Get or create product (using title as unique identifier)
                            product, created = Product.objects.get_or_create(
                                title=title,
                                defaults={
                                    'title': product_data.get('title', ''),
                                    'name': product_data.get('title', ''),
                                    'category': category,
                                    'price': product_data.get('price', ''),
                                    'rating': product_data.get('rating', ''),
                                    'nbr_rating': product_data.get('nbr_rating', ''),
                                    'description': product_data.get('description', ''),
                                    'image': product_data.get('image', ''),
                                }
                            )
                            
                            if created:
                                products_created += 1
                                file_created += 1
                            else:
                                # Update existing product
                                product.title = product_data.get('title', product.title)
                                product.name = product_data.get('title', product.name)
                                product.category = category
                                product.price = product_data.get('price', product.price)
                                product.rating = product_data.get('rating', product.rating)
                                product.nbr_rating = product_data.get('nbr_rating', product.nbr_rating)
                                product.description = product_data.get('description', product.description)
                                product.image = product_data.get('image', product.image)
                                product.save()
                                products_updated += 1
                            
                            if (products_created + products_updated) % 100 == 0:
                                self.stdout.write(f'    Processed {products_created + products_updated} products...')
                        
                        except json.JSONDecodeError as e:
                            file_errors += 1
                            if file_errors <= 5:
                                self.stdout.write(
                                    self.style.WARNING(f'    JSON decode error on line {line_num}: {str(e)}')
                                )
                        except Exception as e:
                            file_errors += 1
                            errors += 1
                            if file_errors <= 5:
                                self.stdout.write(
                                    self.style.ERROR(f'    Error on line {line_num}: {str(e)}')
                                )
            
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  Error processing {json_file}: {str(e)}'))
                errors += 1
            
            if file_created > 0:
                self.stdout.write(f'    [+] Created {file_created} products from {os.path.basename(json_file)}')
            if file_errors > 0:
                self.stdout.write(
                    self.style.WARNING(f'    [!] {file_errors} errors in {os.path.basename(json_file)}')
                )
        
        self.stdout.write(self.style.SUCCESS(
            f'[+] Created {products_created} new products, updated {products_updated} existing products ({errors} errors)'
        ))

