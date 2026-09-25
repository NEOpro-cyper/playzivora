"""Refresh the GameMonetize snapshot: python3 scripts/import-gamemonetize.py [feed.json]."""
import json,sys,urllib.request,html,re
from pathlib import Path
from urllib.parse import urlparse
ROOT=Path(__file__).resolve().parent.parent
FEED='https://gamemonetize.com/feed.php?format=0&num=20&page=1'
def clean(v):return html.unescape(re.sub(r'<[^>]*>','',str(v or ''))).strip()
def normalize(items):
 out=[];seen=set()
 groups={'Puzzle':{'puzzle','clicker'},'Racing':{'racing','driving'},'Action':{'shooting','action','adventure','multiplayer','fighting'},'Sports':{'sports','soccer'},'Classic':{'board','card','classics'},'Strategy':{'strategy','simulation'}}
 for g in items:
  raw=str(g.get('id',''));u=urlparse(g.get('url',''));t=urlparse(g.get('thumb',''))
  if not raw.isalnum() or raw in seen or u.scheme!='https' or u.hostname not in {'html5.gamemonetize.co','html5.gamemonetize.com'} or t.scheme!='https' or t.hostname!='img.gamemonetize.com':continue
  width=max(1,int(g.get('width',800)));height=max(1,int(g.get('height',600)));cat=clean(g.get('category','Arcade'))
  out.append({'id':'gm-'+raw,'providerId':raw,'title':clean(g['title']),'category':next((k for k,v in groups.items() if cat.lower() in v),'Arcade'),'engine':'gamemonetize','provider':'GameMonetize','art':0,'tag':'NEW','meta':cat+' '+clean(g.get('tags','')),'description':clean(g.get('description','')),'instructions':clean(g.get('instructions')) or 'Follow the instructions and controls inside the game.','url':g['url'],'thumbnail':g['thumb'],'orientation':'portrait' if height>width else 'landscape','width':width,'height':height})
  seen.add(raw)
 if not out:raise ValueError('Feed contains no valid GameMonetize games.')
 return out
if __name__=='__main__':
 feed=json.loads(Path(sys.argv[1]).read_text()) if len(sys.argv)>1 else json.load(urllib.request.urlopen(FEED,timeout=40))
 games=normalize(feed)
 (ROOT/'web/gamemonetize-catalog.js').write_text('/* GameMonetize catalog snapshot; original provider URLs preserved. */\nwindow.GAMEMONETIZE_CATALOG = '+json.dumps(games,ensure_ascii=True,indent=2)+';\n')
 print('Imported',len(games),'GameMonetize games')
