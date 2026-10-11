import json

def get_chunks(filepath, replacements):
    with open(filepath, 'r') as f:
        content = f.read()
    
    chunks = []
    # This is a naive line-by-line replace for simple matches.
    # For multiline, we can do something else.
    lines = content.split('\n')
    for i, line in enumerate(lines):
        for search, replace in replacements:
            if search in line:
                chunks.append({
                    "StartLine": i + 1,
                    "EndLine": i + 1,
                    "TargetContent": line,
                    "ReplacementContent": line.replace(search, replace),
                    "AllowMultiple": True
                })
    return chunks

with open('src/app/actions.ts', 'r') as f:
    content = f.read()
    
# for actions.ts, let's just delete the lines containing bankBalance
# wait, actually let's just remove withdrawChips and depositChips completely.
import re

content = re.sub(r'export async function withdrawChips.*?return stripUser\(updatedUser\)\n}', '', content, flags=re.DOTALL)
content = re.sub(r'export async function depositChips.*?return stripUser\(updatedUser\)\n}', '', content, flags=re.DOTALL)

with open('src/app/actions.ts', 'w') as f:
    f.write(content)

