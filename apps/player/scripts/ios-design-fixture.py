"""Local synthetic IPTV service for simulator UI verification; never bundled with the app."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json, time
from urllib.parse import urlparse, parse_qs
ROOT = Path(__file__).resolve().parents[1]
class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_): pass
    def do_GET(self):
        path = urlparse(self.path).path
        action = parse_qs(urlparse(self.path).query).get('action', [''])[0]
        if path.endswith(('.mp4', '.m3u8', '.ts')):
            body = (ROOT/'assets/demo/glow-study.mp4').read_bytes(); kind = 'video/mp4'
        elif path.endswith('.png'):
            body = (ROOT/'assets/demo/Evening.png').read_bytes(); kind = 'image/png'
        elif path.endswith('guide.xml'):
            now = time.time(); stamp = lambda value: time.strftime('%Y%m%d%H%M%S +0000', time.gmtime(value))
            body = ('<tv><channel id="demo"><display-name>Evening studio</display-name></channel>' + ''.join(f'<programme channel="demo" start="{stamp(now-1200+i*2400)}" stop="{stamp(now+1200+i*2400)}"><title>{title}</title><desc>A public sample schedule for GlowTV UI verification.</desc></programme>' for i,title in enumerate(['Evening studio','The great outdoors','Cinema preview'])) + '</tv>').encode(); kind = 'application/xml'
        else:
            data = {'user_info': {'auth':1,'status':'Active'}, 'server_info': {'timezone':'UTC'}}
            if action == 'get_live_categories': data = [{'category_id':'1','category_name':'Documentary'}]
            elif action == 'get_live_streams': data = [{'stream_id':1,'name':'Evening studio','category_id':'1','epg_channel_id':'demo','stream_icon':'http://127.0.0.1:9090/art.png','direct_source':'http://127.0.0.1:9090/live.mp4','tv_archive':1,'tv_archive_duration':7}]
            elif action == 'get_vod_categories': data = [{'category_id':'2','category_name':'Original demos'}]
            elif action == 'get_vod_streams': data = [{'stream_id':11,'name':'Tidewater','category_id':'2','stream_icon':'http://127.0.0.1:9090/art.png','container_extension':'mp4'}]
            elif action == 'get_series_categories': data = [{'category_id':'3','category_name':'Original demos'}]
            elif action == 'get_series': data = [{'series_id':77,'name':'Tidewater Stories','category_id':'3','cover':'http://127.0.0.1:9090/art.png','plot':'An original GlowTV demo scene.'}]
            elif action == 'get_series_info': data = {'episodes':{'1':[{'id':101,'title':'Evening light','episode_num':1,'container_extension':'mp4','info':{'movie_image':'http://127.0.0.1:9090/art.png'}},{'id':102,'title':'A quiet morning','episode_num':2,'container_extension':'mp4'}]}}
            elif action: data = []
            body = json.dumps(data).encode(); kind = 'application/json'
        self.send_response(200); self.send_header('Content-Type',kind); self.send_header('Content-Length',str(len(body))); self.end_headers(); self.wfile.write(body)
ThreadingHTTPServer(('127.0.0.1',9090),Handler).serve_forever()
