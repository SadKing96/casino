import json
import sys
import subprocess

def process_file(filename, output_name):
    base_content = subprocess.check_output(['git', 'show', f'52b8fed:{filename}']).decode('utf-8')
    current_content = base_content
    edits = 0

    with open('/home/zking/.gemini/antigravity/brain/72bdc838-1a75-4767-a0cb-7e2791e22233/.system_generated/logs/transcript.jsonl', 'r') as f:
        for line in f:
            data = json.loads(line)
            if 'tool_calls' in data:
                for call in data['tool_calls']:
                    args = call.get('args', {})
                    if isinstance(args, str):
                        try: args = json.loads(args)
                        except: pass

                    target = args.get('TargetFile', '').strip('"')
                    if not target.endswith(filename):
                        continue
                        
                    name = call.get('name')
                    if name == 'write_to_file':
                        current_content = args.get('CodeContent', '').replace('\\n', '\n').strip('"')
                        try:
                            decoded = json.loads(args.get('CodeContent', ''))
                            if isinstance(decoded, str): current_content = decoded
                        except: pass
                        edits += 1

                    elif name == 'replace_file_content':
                        target_content = args.get('TargetContent', '')
                        rep_content = args.get('ReplacementContent', '')
                        try:
                            if isinstance(json.loads(target_content), str): target_content = json.loads(target_content)
                            if isinstance(json.loads(rep_content), str): rep_content = json.loads(rep_content)
                        except: pass

                        if target_content in current_content:
                            current_content = current_content.replace(target_content, rep_content)
                            edits += 1
                        else:
                            print(f"Warning: replace failed for {filename}")
                            
                    elif name == 'multi_replace_file_content':
                        chunks = args.get('ReplacementChunks', [])
                        if isinstance(chunks, str):
                            try: chunks = json.loads(chunks)
                            except: chunks = []
                        for chunk in chunks:
                            target_content = chunk.get('TargetContent', '')
                            rep_content = chunk.get('ReplacementContent', '')
                            try:
                                if isinstance(json.loads(target_content), str): target_content = json.loads(target_content)
                                if isinstance(json.loads(rep_content), str): rep_content = json.loads(rep_content)
                            except: pass

                            if target_content in current_content:
                                current_content = current_content.replace(target_content, rep_content)
                                edits += 1
                            else:
                                print(f"Warning: multi-replace failed for {filename}")

    with open(output_name, 'w') as out:
        out.write(current_content)
    print(f"Reconstructed {output_name} with {edits} edits")

process_file('src/app/games/frankenstein/page.tsx', 'frank_page_reconstructed.tsx')
process_file('src/app/games/frankenstein/actions.ts', 'frank_actions_reconstructed.ts')
