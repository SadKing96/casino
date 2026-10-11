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
                if 'frankenstein/actions.ts' not in target:
                    continue
                    
                name = call.get('name')
                if name == 'replace_file_content':
                    print("--- REPLACE ---")
                    print(args.get('ReplacementContent', ''))
                elif name == 'multi_replace_file_content':
                    print("--- MULTI REPLACE ---")
                    chunks = args.get('ReplacementChunks', [])
                    if isinstance(chunks, str):
                        try: chunks = json.loads(chunks)
                        except: chunks = []
                    for chunk in chunks:
                        print(chunk.get('ReplacementContent', ''))
