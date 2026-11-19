from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
out=Path(__file__).parent/'after'
screens=['home','guide','player','movies','series','playlists','search','settings']
for device in ['ios','android','ipad','tv','tv-dp1080']:
 for theme in ['light','dark']:
  for scale in ([1] if device.startswith('tv') else [1,2]):
   case=f'{device}-{theme}-text{scale}'
   columns=2 if device.startswith('tv') else 4
   width,height=(640,360) if device.startswith('tv') else (260,555 if device!='ipad' else 347)
   sheet=Image.new('RGB',(columns*width,((len(screens)+columns-1)//columns)*(height+30)),(230,230,230));draw=ImageDraw.Draw(sheet)
   for i,screen in enumerate(screens):
    path=out/f'{case}-{screen}.png'
    if not path.exists():continue
    im=Image.open(path).convert('RGB');im=ImageOps.contain(im,(width,height));x=(i%columns)*width;y=(i//columns)*(height+30)
    sheet.paste(im,(x,y+30));draw.text((x+8,y+8),case+' / '+screen,fill='black')
   sheet.save(out/f'{case}-contact.jpg',quality=85)
