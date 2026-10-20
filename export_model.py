"""Train the project's Random Forest and export it for the website.
Run from the biodiversity_app folder:  python export_model.py
Uses data/Markov*.xlsx if present, otherwise synthetic DEMO data (flagged on the site)."""
import json
from pathlib import Path
from core import classifier as clf
from core.constants import STATES
from core.data_loader import find_file, read_any, parse_status_changes
from core.demo_data import demo_status_changes

ROOT = Path(__file__).parent
# Curated well-known species: (scientific, common, group, status). Verify against iucnredlist.org before relying on them.
CURATED = [
 ("Ailuropoda melanoleuca","Giant Panda","MAMMALIA","VU"),("Panthera tigris","Tiger","MAMMALIA","EN"),
 ("Panthera uncia","Snow Leopard","MAMMALIA","VU"),("Panthera leo","Lion","MAMMALIA","VU"),
 ("Acinonyx jubatus","Cheetah","MAMMALIA","VU"),("Elephas maximus","Asian Elephant","MAMMALIA","EN"),
 ("Loxodonta africana","African Savanna Elephant","MAMMALIA","EN"),("Loxodonta cyclotis","African Forest Elephant","MAMMALIA","CR"),
 ("Balaenoptera musculus","Blue Whale","MAMMALIA","EN"),("Diceros bicornis","Black Rhinoceros","MAMMALIA","CR"),
 ("Rhinoceros unicornis","Indian Rhinoceros","MAMMALIA","VU"),("Pongo abelii","Sumatran Orangutan","MAMMALIA","CR"),
 ("Ursus maritimus","Polar Bear","MAMMALIA","VU"),("Vulpes vulpes","Red Fox","MAMMALIA","LC"),
 ("Canis lupus","Grey Wolf","MAMMALIA","LC"),("Giraffa camelopardalis","Giraffe","MAMMALIA","VU"),
 ("Pan troglodytes","Chimpanzee","MAMMALIA","EN"),("Phocoena sinus","Vaquita","MAMMALIA","CR"),
 ("Haliaeetus leucocephalus","Bald Eagle","AVES","LC"),("Falco peregrinus","Peregrine Falcon","AVES","LC"),
 ("Pavo cristatus","Indian Peafowl","AVES","LC"),("Ardeotis nigriceps","Great Indian Bustard","AVES","CR"),
 ("Strigops habroptilus","Kakapo","AVES","CR"),("Raphus cucullatus","Dodo","AVES","EX"),
 ("Gavialis gangeticus","Gharial","REPTILIA","CR"),("Eretmochelys imbricata","Hawksbill Sea Turtle","REPTILIA","CR"),
 ("Chelonia mydas","Green Sea Turtle","REPTILIA","EN"),("Dermochelys coriacea","Leatherback Sea Turtle","REPTILIA","VU"),
 ("Varanus komodoensis","Komodo Dragon","REPTILIA","EN"),("Incilius periglenes","Golden Toad","AMPHIBIA","EX"),
]
f = find_file(ROOT / "data", ["Markov*.xlsx", "Markov*.xls"])
if f:
    species, _ = parse_status_changes(read_any(f.read_bytes(), f.name)); demo = False
else:
    species = demo_status_changes(); demo = True
b = clf.train_random_forest(species)
model = {}
for g in list(b["taxonomies"]) + ["__unseen__"]:
    model[g] = {s: {r["IUCN status"]: round(float(r["Probability"]), 6) for _, r in clf.predict_status(b, g, s)["table"].iterrows()} for s in STATES}
db = {} if demo else {r["Scientific name"]: [r["Scientific name"], str(r["Common name"]) if r["Common name"] == r["Common name"] else "", r["Taxonomy"], r["Status_2021"], r["Status_2022"]] for _, r in species.iterrows()}
for sci, com, grp, st in CURATED:
    db.setdefault(sci, [sci, com, grp, st, ""])
out = {"demo": demo, "groups": b["taxonomies"], "model": model, "species": sorted(db.values(), key=lambda x: x[0])}
Path(ROOT / "biodiversity_website" / "data.js").write_text(
    "var BIO = " + json.dumps(out, ensure_ascii=False) + ";\nif (typeof module !== 'undefined') module.exports = BIO;\n", encoding="utf-8")
print("Exported", "DEMO" if demo else "REAL", "model:", len(out["species"]), "species,", len(out["groups"]), "groups")
