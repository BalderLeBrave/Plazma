import re, os, subprocess, sys
SRC="src"
GLOBALS=set("""window document console Math JSON Object Array String Number Boolean Date Intl Promise Map Set
RegExp Error parseInt parseFloat isNaN isFinite alert confirm prompt setTimeout clearTimeout FileReader Blob URL
Image React Infinity NaN Symbol WeakMap Function""".split())

def code_seul(t):
    t=re.sub(r'/\*.*?\*/',' ',t,flags=re.S); t=re.sub(r'//[^\n]*',' ',t)
    t=re.sub(r'`(?:\\.|[^`\\])*`','``',t,flags=re.S)
    t=re.sub(r'"(?:\\.|[^"\\])*"','""',t); t=re.sub(r"'(?:\\.|[^'\\])*'","''",t)
    return t

probs=0
for root,_,files in os.walk(SRC):
    for fn in sorted(files):
        p=os.path.join(root,fn)
        raw=open(p,encoding='utf-8').read()
        js=subprocess.run(["npx","esbuild",p,"--loader:.jsx=jsx","--loader:.js=jsx","--format=esm"],
                          capture_output=True,text=True).stdout or raw
        code=code_seul(js)
        importes=set()
        for m in re.finditer(r'import\s+(?:(\w+)\s*,\s*)?\{([^}]*)\}\s*from|import\s+(\w+)\s+from', raw):
            if m.group(1): importes.add(m.group(1))
            if m.group(2): importes.update(x.strip().split(" as ")[-1] for x in m.group(2).split(",") if x.strip())
            if m.group(3): importes.add(m.group(3))
        locales=set(re.findall(r'\b(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)', code))
        for bloc in re.findall(r'\b(?:const|let|var)\s*[\[{]([^\]}]*)[\]}]\s*=', code):
            locales|=set(re.findall(r'[A-Za-z_$][\w$]*', bloc))
        for bloc in re.findall(r'\(([^)]*)\)\s*=>', code)+re.findall(r'function\s*\w*\s*\(([^)]*)\)', code):
            locales|=set(re.findall(r'[A-Za-z_$][\w$]*', bloc))
        # déclarations multiples : const a = 1, B = 2
        for bloc in re.findall(r'\b(?:const|let|var)\s+([^;{}\n]+)', code):
            locales|=set(re.findall(r'([A-Za-z_$][\w$]*)\s*=', bloc))
        # clés d'objet non quotées : { Plaque: 9 }
        cles=set(re.findall(r'([A-Za-z_$][\w$]*)\s*:', code))
        employes=set(re.findall(r'(?<![\w$.])([A-Z][A-Za-z0-9_$]*)(?![\w$])', code))-cles
        manq=sorted(e for e in employes if e not in importes and e not in locales and e not in GLOBALS)
        if manq:
            probs+=1; print(f"{p}\n    non importé : {', '.join(manq)}")
print("\nAucun identifiant manquant." if not probs else f"\n{probs} fichier(s) à corriger.")
