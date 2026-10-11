import json

with open('/home/zking/.gemini/antigravity/brain/72bdc838-1a75-4767-a0cb-7e2791e22233/.system_generated/logs/transcript.jsonl', 'r') as f:
    frank_page_code = None
    frank_action_code = None
    
    for line in f:
        data = json.loads(line)
        if data.get('type') == 'PLANNER_RESPONSE' or data.get('type') == 'ACTION_RESPONSE':
            pass
            
        # We need to find tool calls that wrote to frankenstein
        if 'tool_calls' in data:
            for call in data['tool_calls']:
                args_str = call.get('arguments', '{}')
                if isinstance(args_str, str):
                    try:
                        args = json.loads(args_str)
                    except:
                        args = {}
                else:
                    args = args_str
                
                # Check write_to_file
                if call.get('name') == 'write_to_file':
                    if 'frankenstein/page.tsx' in args.get('TargetFile', ''):
                        frank_page_code = args.get('CodeContent', '')
                    if 'frankenstein/actions.ts' in args.get('TargetFile', ''):
                        frank_action_code = args.get('CodeContent', '')
                        
    if frank_page_code:
        with open('frank_page_recovered.tsx', 'w') as out:
            out.write(frank_page_code)
        print("Recovered frank_page_recovered.tsx")
        
    if frank_action_code:
        with open('frank_actions_recovered.ts', 'w') as out:
            out.write(frank_action_code)
        print("Recovered frank_actions_recovered.ts")
