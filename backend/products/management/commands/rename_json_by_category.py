import json
import os
import glob
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Rename JSON files in data folder based on their product categories'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be renamed without actually renaming',
        )

    def handle(self, *args, **options):
        # Get the path to the data folder
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        data_dir = os.path.join(base_dir, 'data')
        
        if not os.path.exists(data_dir):
            self.stdout.write(self.style.ERROR(f'Data directory not found: {data_dir}'))
            return
        
        self.stdout.write(self.style.WARNING('Scanning JSON files to determine categories...'))
        
        json_files = glob.glob(os.path.join(data_dir, '*.json'))
        rename_plan = []
        
        for json_file in json_files:
            filename = os.path.basename(json_file)
            category = self.detect_category(json_file)
            
            if category:
                # Create new filename based on category
                category_safe = category.replace(' ', '_').lower()
                new_filename = f"{category_safe}.json"
                new_path = os.path.join(data_dir, new_filename)
                
                # If file already exists and it's different, add suffix
                if os.path.exists(new_path) and new_path != json_file:
                    base_name = category_safe
                    counter = 1
                    while os.path.exists(new_path):
                        new_filename = f"{base_name}_{counter}.json"
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
        
        if options['dry_run']:
            self.stdout.write(self.style.WARNING('\n[DRY RUN] Files would be renamed as shown above.'))
            self.stdout.write(self.style.WARNING('Run without --dry-run to perform the actual renaming.'))
        else:
            self.stdout.write(f'\nRenaming {len(rename_plan)} file(s)...')
            renamed = 0
            errors = 0
            
            for old_path, new_path, category in rename_plan:
                try:
                    # If target file exists and is different, we need to handle it
                    if os.path.exists(new_path) and new_path != old_path:
                        # This shouldn't happen due to our counter logic, but just in case
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
                f'\n[+] Renamed {renamed} file(s) ({errors} errors)'
            ))

    def detect_category(self, json_file):
        """Detect the category from a JSON file by reading the first few products"""
        categories_found = set()
        
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                # Read first 10 lines to determine category
                for i, line in enumerate(f):
                    if i >= 10:  # Check first 10 products
                        break
                    
                    line = line.strip()
                    if not line:
                        continue
                    
                    try:
                        product_data = json.loads(line)
                        
                        # Check for different JSON structures
                        if 'categorie' in product_data:
                            categorie = product_data.get('categorie', '').strip()
                            if categorie:
                                categories_found.add(categorie)
                        elif 'payload' in product_data:
                            # Handle pc.json structure - it doesn't have categorie field
                            # We'll need to infer or use a default
                            pass
                        
                    except json.JSONDecodeError:
                        continue
            
            # Return the most common category, or None if none found
            if categories_found:
                # If all products have the same category, return it
                if len(categories_found) == 1:
                    return list(categories_found)[0]
                else:
                    # Multiple categories found - return the first one
                    # In this case, the file might have mixed categories
                    return list(categories_found)[0]
            
            # If no category found, try to infer from filename
            filename = os.path.basename(json_file).lower()
            if 'high' in filename or 'tech' in filename:
                return 'high tech'
            elif 'parfum' in filename:
                return 'parfum'
            elif 'access' in filename or 'acess' in filename:
                return 'accessoires'
            elif 'sport' in filename or 'vetement' in filename:
                return 'vetement sport'
            elif 'airpod' in filename:
                return 'airpods'
            elif 'smartwatch' in filename or 'watch' in filename:
                return 'smartwatch'
            elif 'tablet' in filename:
                return 'tablette'
            elif 'pc' in filename:
                # pc.json has a different structure, might need special handling
                return 'pc'
            
            return None
            
        except Exception as e:
            self.stdout.write(
                self.style.WARNING(f'Error reading {os.path.basename(json_file)}: {str(e)}')
            )
            return None

