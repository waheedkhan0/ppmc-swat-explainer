import asyncio
import json
import os
from pathlib import Path
import edge_tts

VOICE = "en-US-GuyNeural"  # Professional, authoritative, clear documentary style voice
RATE = "+0%"
PITCH = "+0Hz"

SCENES = [
    {
        "id": "ch0_overview",
        "chapter": 0,
        "title": "Project Profile & Overview",
        "subtitle": "Upper Swat Rural Gravity-Solar Clean Drinking Water Scheme",
        "text": "Welcome to the Public Project Management Cycle in action. We follow a single concrete development project through all nine chapters of the Khyber Pakhtunkhwa Manual for Development Projects 2022. Our benchmark initiative is the Upper Swat Rural Gravity-Solar Clean Drinking Water and Watershed Conservation Scheme, spanning Tehsils Matta and Bahrain. Sponsoring Agency: Public Health Engineering Department. Executing Agency: Executive Engineer Swat. Target Output: 42 decentralized solar-lift and gravity-piped filtration stations supplying 150,000 rural residents, with an estimated capital cost of 1.2 Billion Rupees over a 36-month implementation period.",
    },
    {
        "id": "ch1_constitution",
        "chapter": 1,
        "title": "Chapter 1: Socio-Economic Planning & Constitutional Foundations",
        "subtitle": "Articles 37 & 38 and PFM Act 2019 Section 14",
        "text": "Before putting pen to paper, planners must ground every public investment in constitutional and statutory law. Under Articles 37 and 38 of the Constitution of Pakistan, the state is mandated to promote social justice and eradicate regional disparity. Clean drinking water directly fulfills basic human rights obligations. Concurrently, Section 14 of the Khyber Pakhtunkhwa Public Finance Management Act 2019 enforces strict governance: Section 14 sub-section 1 prohibits arbitrary shortcuts in the project cycle, while Section 14 sub-section 2 mandates that because the project cost exceeds statutory thresholds, a comprehensive socio-economic cost-benefit analysis must be completed prior to sanctioning.",
    },
    {
        "id": "ch2_machinery",
        "chapter": 2,
        "title": "Chapter 2: Public Sector Planning Machinery & Sanctioning Route",
        "subtitle": "Multi-Tier Approval Hierarchy & Digital Registration",
        "text": "Where does this project navigate through the government's multi-tier approval hierarchy? The initiative originates from identified rural deficits compiled by Tehsil Development Committees in Matta and Bahrain, endorsed by the District Development Committee headed by the Deputy Commissioner Swat. However, with a capital cost of 1.2 Billion Rupees, it exceeds the 50 Million Rupee limit of the DDC and the 200 Million Rupee limit of Departmental Working Parties. It therefore advances directly to the Provincial Development Working Party, chaired by the Additional Chief Secretary. If provincial funds suffice, PDWP sanctions it autonomously; if federal or foreign cost-sharing is required, it moves to the federal CDWP and ECNEC. Crucially, the scheme is digitally registered in the Intelligent Project Automation System, i-PAS, receiving a permanent digital tracking code.",
    },
    {
        "id": "ch3_concept",
        "chapter": 3,
        "title": "Chapter 3: Project Identification & Concept Clearance",
        "subtitle": "Diagnostic Studies & Provincial Concept Clearance Committee (PCCC)",
        "text": "A public project cannot jump straight to engineering design without concept validation. Project identification is rooted in empirical diagnostics: PHED water testing surveys showing severe pathogen contamination, cross-referenced with Swat's District SDG Scorecard showing acute stunting rates and water access deficits. Before engaging costly consultants, PHED submits Annexure 3-C, the Project Concept Form for New Initiatives, to the Provincial Concept Clearance Committee, or PCCC. The PCCC subjects the concept to three tests: alignment with the provincial PAMframe, non-duplication with existing irrigation works, and financial feasibility for long-term operations and maintenance. Formal clearance by PCCC greenlights full pre-investment preparation.",
    },
    {
        "id": "ch4_costing",
        "chapter": 4,
        "title": "Chapter 4: Project Preparation, Feasibility & Costing Standards",
        "subtitle": "PC-II Feasibility, PC-I Formulation & Rigid Costing Formulas",
        "text": "Because the project exceeds the 500 Million Rupee statutory threshold, Chapter 4 mandates a preliminary PC-II Feasibility Study. PHED engages pre-qualified engineering consultants through KPPRA rules to carry out hydrogeological spring yield assays, GIS topographic pipeline routes, and an Environmental Impact Assessment. Following validation, the comprehensive Infrastructure PC-I is drafted. The manual enforces a rigid formula: Total Capital Cost equals Base Cost of 1,070 Million Rupees, plus 3 percent Physical Contingency of 32.1 Million Rupees strictly reserved for unforeseen underground rock strata, plus Financial Price Contingency of 97.9 Million Rupees for compounded inflation over 3 years, totaling 1,200 Million Rupees. Three-year financial phasing allocates 350 Million in Year 1, 550 Million in Year 2, and 300 Million in Year 3, backed by statutory certification from the Executive Engineer and Administrative Secretary.",
    },
    {
        "id": "ch5_appraisal",
        "chapter": 5,
        "title": "Chapter 5: Project Appraisal & Economic Conversion",
        "subtitle": "Six Appraisal Dimensions, Shadow Prices & Decision Rules",
        "text": "The P and D Department's Appraisal Section now subjects the proposal to six rigorous dimensions: Technical, Institutional, Environmental, Financial, Social, and Economic. Because market prices contain distortions, economists apply shadow conversion parameters from the Manual. Domestic non-traded materials worth 600 Million Rupees are multiplied by the Standard Conversion Factor of 0.90, yielding an economic cost of 540 Million by removing indirect taxes. Rural unskilled labor worth 100 Million Rupees is adjusted by the Shadow Wage Rate Factor of 0.80, reducing economic labor cost to 80 Million Rupees to reflect true rural underemployment. On the benefit side, reduced waterborne disease saves hospital costs, and women save two and a half hours daily fetching water. Applying a 10 percent Social Discount Rate, the Financial IRR is only 4.2 percent, but the Economic IRR reaches a remarkable 15.8 percent, with a positive Net Present Value of 240 Million Rupees. Because the Economic IRR clears the 10 percent hurdle rate, the PDWP formally sanctions the project.",
    },
    {
        "id": "ch6_implementation",
        "chapter": 6,
        "title": "Chapter 6: Project Implementation, Governance & Revisions",
        "subtitle": "Administrative Approval, ASAAN Account & The Non-Resetting 15% Rule",
        "text": "Following PDWP sanction, the Administrative Department issues Administrative Approval. Under the provincial release policy, 100 percent of Year 1 funds, 350 Million Rupees, are transferred to a dedicated ASAAN Assignment Account at the National Bank of Pakistan. A full-time Project Director is recruited through competitive selection under the KP Project Policy on Project Pay Scale 9, and contracts are tendered transparently under KPPRA Rules 2014. In Year 2, flash floods damage a valve station, increasing costs by 96 Million Rupees, or 8 percent. This is approved locally by the DDWP within its 15 percent margin. But in Year 3, steel and solar price surges add another 96 Million Rupees, or 8 percent. Under Annexure 6-CD, the non-resetting rule applies: 8 plus 8 equals 16 percent against the original baseline. Because 16 percent breaches the 15 percent statutory threshold, the DDWP has no authority; a Revised PC-I must be submitted to the PDWP for fresh sanction.",
    },
    {
        "id": "ch7_monitoring",
        "chapter": 7,
        "title": "Chapter 7: Monitoring and Evaluation (M&E)",
        "subtitle": "CREAM Indicators, Digital PC-III & Unannounced Field Audits",
        "text": "Implementation is steered through Results-Based Monitoring anchored in CREAM indicators: Clear, Relevant, Economic, Adequate, and Monitorable. The primary benchmark: percentage of target households receiving 45 liters per capita per day of potable water meeting WHO standards. Every quarter, the Project Director submits physical and financial milestone reports via Form PC-III through i-PAS. Crucially, the Directorate General of M and E conducts independent, unannounced field inspections, taking GPS-tagged photographic evidence and laboratory concrete core samples to eliminate ghost schemes and fictitious billing.",
    },
    {
        "id": "ch8_closure",
        "chapter": 8,
        "title": "Chapter 8: Project Closure & Asset Handover",
        "subtitle": "Surrender of Contingencies, PC-IV Handover & Post-Evaluation PC-V",
        "text": "When the taps flow, physical construction ends, but formal administrative closeout is legally required. Audited final expenditure stands at 1,180 Million Rupees. The remaining 20 Million Rupees of unspent physical contingency savings cannot be re-appropriated; it is strictly surrendered to the Provincial Consolidated Fund, and the ASAAN account is officially closed. A comprehensive PC-IV Project Completion Report is submitted with as-built engineering drawings. The 42 completed stations are transitioned from the development budget to PHED's regular non-development revenue budget, securing recurring allocations for chlorine, solar maintenance, and operators. Finally, annual PC-V evaluations are conducted for three consecutive years to verify long-term health improvements in local clinics.",
    },
    {
        "id": "ch9_emerging",
        "chapter": 9,
        "title": "Chapter 9: Emerging Initiatives Mainstreamed",
        "subtitle": "Gender Equality Marker, Nutrition Markers & SDG Targets",
        "text": "The Upper Swat project embodies modern planning markers mainstreamed in Chapter 9. It achieves a Tier-3 rating on the Gender Equality Marker because women directly participated in designing tap stand locations, easing daily burdens and allowing girls to attend school. It is officially tagged as Nutrition-Sensitive, recognizing that eradicating waterborne diarrhea prevents chronic gut malabsorption and child stunting. Globally, it maps directly to SDG 6 for clean water, SDG 3 for health and well-being, and SDG 5 for gender equality, providing direct positive feedback into District Swat's provincial SDG Scorecard.",
    },
]


async def generate_single_audio(scene, audio_dir):
    out_file = audio_dir / f"{scene['id']}.mp3"
    meta_file = audio_dir / f"{scene['id']}.json"

    print(f"Synthesizing {scene['id']}...")
    communicate = edge_tts.Communicate(scene["text"], VOICE, rate=RATE, pitch=PITCH)
    
    words = []
    audio_bytes = bytearray()
    
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_bytes.extend(chunk["data"])
        elif chunk["type"] == "WordBoundary":
            s = chunk["offset"] / 1e7
            dur = chunk["duration"] / 1e7
            words.append({
                "text": chunk["text"],
                "start": round(s, 2),
                "end": round(s + dur, 2)
            })
            
    out_file.write_bytes(bytes(audio_bytes))
    
    # Calculate duration
    duration = words[-1]["end"] if words else 0.0
    scene_meta = {
        "id": scene["id"],
        "chapter": scene["chapter"],
        "title": scene["title"],
        "subtitle": scene["subtitle"],
        "text": scene["text"],
        "audio_file": f"audio/{scene['id']}.mp3",
        "duration": duration,
        "words": words
    }
    meta_file.write_text(json.dumps(scene_meta, indent=2))
    print(f"Done {scene['id']}: Duration = {duration:.2f}s, Words = {len(words)}")
    return scene_meta


async def main():
    proj_dir = Path("E:/Dev/animations/ppmc_swat_explainer")
    audio_dir = proj_dir / "audio"
    audio_dir.mkdir(parents=True, exist_ok=True)
    
    all_metadata = []
    for scene in SCENES:
        meta = await generate_single_audio(scene, audio_dir)
        all_metadata.append(meta)
        
    master_meta_file = proj_dir / "audio" / "metadata.json"
    master_meta_file.write_text(json.dumps(all_metadata, indent=2))
    print(f"\nAll 10 chapters synthesized successfully! Metadata saved to {master_meta_file}")

if __name__ == "__main__":
    asyncio.run(main())
