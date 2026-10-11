import json

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
                if 'frankenstein/page.tsx' not in target:
                    continue
                    
                name = call.get('name')
                if name == 'replace_file_content':
                    print("--- REPLACE ---")
                    print("TARGET:")
                    print(args.get('TargetContent', ''))
                    print("REPLACEMENT:")
                    print(args.get('ReplacementContent', ''))
                    print("--------------\n")
                elif name == 'multi_replace_file_content':
                    print("--- MULTI REPLACE ---")
                    chunks = args.get('ReplacementChunks', [])
                    if isinstance(chunks, str):
                        try: chunks = json.loads(chunks)
                        except: chunks = []
                    for chunk in chunks:
                        print("TARGET:")
                        print(chunk.get('TargetContent', ''))
                        print("REPLACEMENT:")
                        print(chunk.get('ReplacementContent', ''))
                    print("--------------\n")
