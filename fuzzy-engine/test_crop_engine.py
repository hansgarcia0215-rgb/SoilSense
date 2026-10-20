"""Quick smoke test for the new crop engine."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from engine.crop_engine import rank_crops

crops = [
    {'cropId':'mango_kinalabaw','cropName':'Mango — Kinalabaw','isActive':True,'currentFarmCrop':True,
     'requirements':{'phMin':5.5,'phMax':7.5,'phOptimal':6.0,'moistureMin':40,'moistureMax':75,'moistureOptimal':55,'fertilityMin':'moderate'},
     'suitabilityWeights':{'fertility':0.30,'ph':0.25,'moisture':0.20,'soilCondition':0.15,'location':0.10},
     'minSuitabilityThreshold':45,'locationScoreRoxas':0.90},
    {'cropId':'durian','cropName':'Durian','isActive':True,'currentFarmCrop':True,
     'requirements':{'phMin':6.0,'phMax':7.0,'phOptimal':6.5,'moistureMin':60,'moistureMax':85,'moistureOptimal':72,'fertilityMin':'fertile'},
     'suitabilityWeights':{'fertility':0.35,'ph':0.25,'moisture':0.20,'soilCondition':0.12,'location':0.08},
     'minSuitabilityThreshold':55,'locationScoreRoxas':0.75},
    {'cropId':'sampalok','cropName':'Sampalok','isActive':True,'currentFarmCrop':True,
     'requirements':{'phMin':5.5,'phMax':8.5,'phOptimal':6.5,'moistureMin':25,'moistureMax':65,'moistureOptimal':45,'fertilityMin':'poor'},
     'suitabilityWeights':{'fertility':0.20,'ph':0.25,'moisture':0.28,'soilCondition':0.17,'location':0.10},
     'minSuitabilityThreshold':35,'locationScoreRoxas':0.88},
]

scenarios = [
    ('MODERATE (pH 6.2, 57%)', 6.2, 57, 'moderate', 68, 'good'),
    ('FERTILE  (pH 6.6, 68%)', 6.6, 68, 'fertile',  79, 'good'),
    ('POOR     (pH 5.1, 28%)', 5.1, 28, 'poor',      25, 'poor'),
]

for label, ph, moist, fc, fs, vc in scenarios:
    print(f'\n=== {label} ===')
    results = rank_crops(ph=ph, moisture=moist, fertility_class=fc, fertility_score=fs, visual_condition=vc, crops=crops)
    for c in results:
        print(f'  {c["status"]:15}  {c["cropName"]:25}  {c["suitabilityScore"]}%')
        if c.get('farmerSummary'):
            print(f'               → {c["farmerSummary"][:80]}...')

print('\n✅ Crop engine test complete.')
