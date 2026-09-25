"""Import a reviewed-size GamePix catalog snapshot, preserving publisher attribution.
Run: python3 scripts/import-gamepix.py [downloaded-feed.json]
Without an argument, fetches the first 96 games using the configured publisher SID.
"""
import json, sys, urllib.request
from pathlib import Path
from urllib.parse import urlparse, parse_qs
ROOT=Path(__file__).resolve().parent.parent
SID='5005N'
FEED=f'https://feeds.gamepix.com/v2/json?sid={SID}&pagination=96&page=1'
groups={
 'Puzzle':{'puzzle','match-3','2048','brain','math','memory','trivia','hidden-object','block','educational'},
 'Racing':{'racing','car','driving','motorcycle'},
 'Classic':{'board','card','chess','checkers','solitaire'},
 'Sports':{'sports','basketball','golf','football','soccer','tennis'},
 'Action':{'battle','fighting','first-person-shooter','shooter','tanks','zombie','adventure','monster','robots','airplane'},
 'Strategy':{'strategy','building','farming','simulation','idle'}
}
def normalize(feed):
 out=[];seen=set()
 for g in feed.get('items',[]):
  raw=str(g.get('id',''))
  if not raw or not raw.isalnum() or raw in seen:continue
  url=g.get('url','');u=urlparse(url)
  if u.scheme!='https' or u.hostname!='play.gamepix.com' or parse_qs(u.query).get('sid')!=[SID]:continue
  thumb=g.get('banner_image') or g.get('image','');t=urlparse(thumb)
  if t.scheme!='https' or t.hostname!='img.gamepix.com':continue
  cat=g.get('category','arcade')
  out.append({'id':'gpx-'+raw,'providerId':raw,'title':g.get('title') or 'Untitled game','category':next((k for k,v in groups.items() if cat in v),'Arcade'),'engine':'gamepix','provider':'GamePix','art':0,'tag':'GAMEPIX','meta':cat.replace('-',' ').title(),'description':g.get('description',''),'instructions':g.get('description') or 'Follow the instructions inside the game. Use the game’s own controls and menus to begin.','url':url,'thumbnail':thumb,'orientation':g.get('orientation','all'),'width':g.get('width',800),'height':g.get('height',600)})
  seen.add(raw)
 if not out:raise ValueError('The feed did not contain valid games for the configured SID.')
 return out
if __name__=='__main__':
 feed=json.loads(Path(sys.argv[1]).read_text()) if len(sys.argv)>1 else json.load(urllib.request.urlopen(FEED,timeout=40))
 games=normalize(feed)
 target=ROOT/'web'/'gamepix-catalog.js'
 target.write_text('/* GamePix catalog snapshot. Rebuild using scripts/import-gamepix.py. */\nwindow.GAMEPIX_CATALOG = '+json.dumps(games,ensure_ascii=True,indent=2)+';\n')
 print(f'Imported {len(games)} games; publisher SID preserved: {SID}')
