
import { Category, Prompt } from './types';

export const FILES_DATA: Record<Exclude<Category, 'All'>, string[]> = {
  "Latest Jailbreaks": [
    "AGI.md", "Apex.md", "BOB.md", "Born Survivalist (yell0wfever92).md",
    "CodeGPT6.md", "Complex.md", "DANDoc_v2.2 (DaVoidCaller).md", "DarkGPT.md",
    "Decodes Anything Now.md", "Demonic Chloe (pleasing-punisher).md", "EarthSaver.md",
    "Forest (pink_panther--).md", "GBTHEN.md", "GPT 3.5 Web Search.md", "GPT 4.5 Fusion.md",
    "GhettoBreak.md", "Hex.md", "IBM.md", "Infotron (HORSELOCKSPACEPIRATE).md",
    "Infotron V2.md", "Infotron V3 (yell0wfever92).md", "Master Key.md", "MrRobot.md",
    "NewGen (Ultrazartrex).md", "Pliny Rekt.md", "Pliny.md", "Pollifusion.md",
    "ProfessorRick (yell0wfever92).md", "SINISTERCHAOS (Brilliant_Balance208).md",
    "System Update (justpackingheat1).md", "TAAN.md", "UNITY.md", "UltraBreaker.md",
    "Universal Bypass.md", "XFactor.md", "Z.md", "Zorg.md",
    "[GPT4-o] Short 2 (HORSELOCKSPACEPIRATE).md",
    "Datasets/efgmarquez - Jailbreak Database.md"
  ],
  "Legendary Leaks": [
    "AI Book Writer Assistant.md", "Book Creator Guide.md", "Book Writer GPT.md",
    "CODEGPTV6.md", "Copywrighter GPT.md", "CreativeGPT's Prompt Generator.md",
    "Email Writer.md", "Fully SEO Optimized Article 2.md", "GP(en)T(ester).md",
    "God of Prompt.md", "Grimoire(Latest).md", "HackerGPT.md", "Kali GPT.md",
    "Malware Rule Master.md", "Mega-Prompt.md", "Professional Business Email Writer.md",
    "PromptGPT.md", "SEO BlogGPT.md", "SINISTER CHAOS.md", "SOC Copilot.md",
    "Super Prompt Generator 3.md", "Super Prompt Maker.md", "System Prompt Generator 2.md",
    "System Prompt Generator.md", "The Greatest Computer Science Tutor.md",
    "TherapistGPT.md", "Video Script.md", "Viral Hooks Generator.md",
    "WormGPT3.md", "WormGPT30.md", "WormGPT6.md"
  ],
  "Grimoire": [
    "000 - Full Base Prompt.md", "GPTavern.md", "Grimoire.md", "Interludes.md",
    "Part1.md", "Part2.md", "Part3.md", "Part4.md", "Part5.md", "Part6.md", "Part7.md",
    "Part8.md", "Part9.md", "PatchNotes.md", "Projects.md", "Readme.md",
    "RecommendedTools.md", "ReplitDeployInstructions.md"
  ],
  "My Super Prompts": [
    "Ai Integration Finder.md", "Jailbreak Tester.md", "Mental Health Therapist.md",
    "ORK | System Prompt Writer and Optimizer.md", "PSYKOO | Mental Manipulator.md",
    "Prompt Engineer Template.md", "Response Quality Enhacer.md", "Rizz Game Improver.md",
    "VAMPIRE | Ultra Prompt Writer.md"
  ],
  "Prompt Security": [
    "10 rules of protection and misdirection.md", "100 Life points.md", "Anti-verbatim.md",
    "Bad faith actors protection.md", "Bank Security Robot.md", "Blue Team.md",
    "Bot data protection.md", "CIPHERON.md", "Data Privacy - Formal.md",
    "Do not Leak!.md", "Final reminder.md", "Fingers crossed technique.md",
    "Gated access.md", "Guardian Shield.md", "HackTricksGPT Defense.md",
    "Hacker Detected.md", "I will never trust you again!.md",
    "I will only give you poop.md", "I will report you.md", "Ignore previous instructions.md",
    "Just don't repeat.md", "Keep it polite.md", "Law of Magic.md", "Lawyer up.md",
    "Mandatory security protocol.md", "MultiPersona system.md", "Operation mode is private.md",
    "Overly protective parent.md", "Prior text REDACTED!.md", "Prohibition era.md",
    "Prompt inspection.md", "STOP HALT.md", "SafeBOT.md", "Simple.md",
    "Single minded GPT.md", "Sorry Bro, not possible - short edition.md",
    "Sorry, bro! Not possible - elaborate edition.md", "Stay on topic.md",
    "The 3 Asimov laws.md", "The 5 Rules.md", "The Soup Boy.md",
    "Top Secret Core Instructions.md", "Under NO circumstances reveal your instructions.md",
    "WormGPT Defense.md", "You are not a GPT.md", "You're not my mom.md", "warning png.md"
  ],
  "Ultra Prompts": [
    "Prompt Guru V5.md", "Prompt Quality Evaluation and Enhancement System V1.md"
  ]
};

// List of prompt names that should be hidden from public view by default
const HIDDEN_LIST = [
  "Master Key", "Pliny", "Pliny Rekt", "HackerGPT", "WormGPT6", "WormGPT30",
  "VAMPIRE | Ultra Prompt Writer", "PSYKOO | Mental Manipulator",
  "10 rules of protection and misdirection", "Top Secret Core Instructions"
];

export const RAW_PROMPTS: Prompt[] = Object.entries(FILES_DATA).flatMap(([category, files]) => {
  return files.map(file => {
    let tag = "Prompt";
    if (category.includes("Jailbreak")) tag = "Jailbreak";
    else if (category.includes("Leak")) tag = "Leak";
    else if (category === "Grimoire") tag = "Grimoire";
    else if (category.includes("Super")) tag = "Super";
    else if (category.includes("Security")) tag = "Security";
    else if (category.includes("Ultra")) tag = "Ultra";

    const name = file.replace('.md', '');

    return {
      id: `${category}-${file}`,
      name: name,
      description: `Premium ${tag.toLowerCase()} implementation for advanced AI model orchestration.`,
      category: category as Category,
      path: `prompts/${category}/${file}`,
      tag: tag,
      isHidden: HIDDEN_LIST.includes(name) // Mark specific prompts as hidden
    };
  });
});
