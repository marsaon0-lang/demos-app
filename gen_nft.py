import base64, pathlib
root=pathlib.Path(__file__).parent
imgs={}
for ton in [1,10,100]:
    f=root/'assets'/f'nft-{ton}ton.webp'
    if f.exists(): imgs[ton]='data:image/webp;base64,'+base64.b64encode(f.read_bytes()).decode()
(root/'src'/'nft_images.js').write_text('// Картинки NFT (сгенерировано из assets/*.webp)\nconst NFT_IMG = '+repr(imgs).replace("'",'"')+';\n',encoding='utf-8')
print(sorted(imgs))
