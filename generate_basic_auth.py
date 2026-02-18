import os
import base64
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get username and password
username = os.getenv('GRAPHQL_USER')
password = os.getenv('GRAPHQL_PASS')

if not username or not password:
    print("Error: GRAPHQL_USER and GRAPHQL_PASS must be set in .env file")
    exit(1)

# Create the credentials string
credentials = f"{username}:{password}"

# Encode to base64
encoded_credentials = base64.b64encode(credentials.encode('utf-8')).decode('utf-8')

# Create the Basic Auth token
basic_auth_token = f"Basic {encoded_credentials}"

print("Generated Basic Auth Token:")
print(basic_auth_token)

# Optionally, update the .env file with the token
update_env = input("\nDo you want to update GRAPHQL_BASIC_AUTH in .env? (y/n): ")
if update_env.lower() == 'y':
    with open('.env', 'r') as file:
        lines = file.readlines()
    
    with open('.env', 'w') as file:
        found = False
        for line in lines:
            if line.startswith('GRAPHQL_BASIC_AUTH='):
                file.write(f'GRAPHQL_BASIC_AUTH={basic_auth_token}\n')
                found = True
            else:
                file.write(line)
        
        if not found:
            file.write(f'GRAPHQL_BASIC_AUTH={basic_auth_token}\n')
    
    print("✓ .env file updated successfully!")