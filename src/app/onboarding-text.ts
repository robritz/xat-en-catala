import type { Level, NativeLanguage } from "@/lib/learner-profile";

// What the level step of onboarding says, in each native language. It is the
// one part of the interface that is translated: a user who reads no Catalan
// has to be able to judge their level. Each level is described in a line drawn
// from the Council of Europe's CEFR self-assessment grid, in the first person.
// The French, German and Basque want a native speaker's check.
type LevelStepText = { question: string; back: string; start: string; levels: Record<Level, string> };

export const LEVEL_STEP_TEXT: Record<NativeLanguage, LevelStepText> = {
  en: {
    question: "What is your level of Catalan?",
    back: "Back",
    start: "Start",
    levels: {
      A1: "I know a few words and simple phrases.",
      A2: "I can handle simple, everyday exchanges.",
      B1: "I can get by in most everyday situations.",
      B2: "I can talk about many topics with some fluency.",
      C1: "I express myself fluently on almost any topic.",
      C2: "I understand and express almost everything with ease.",
    },
  },
  es: {
    question: "¿Cuál es tu nivel de catalán?",
    back: "Atrás",
    start: "Empezar",
    levels: {
      A1: "Conozco algunas palabras y frases sencillas.",
      A2: "Me desenvuelvo en intercambios sencillos y cotidianos.",
      B1: "Me defiendo en la mayoría de situaciones cotidianas.",
      B2: "Hablo de muchos temas con cierta fluidez.",
      C1: "Me expreso con fluidez sobre casi cualquier tema.",
      C2: "Entiendo y expreso casi todo con facilidad.",
    },
  },
  eu: {
    question: "Zein da zure katalan maila?",
    back: "Atzera",
    start: "Hasi",
    levels: {
      A1: "Hitz eta esaldi erraz batzuk ezagutzen ditut.",
      A2: "Eguneroko elkarrizketa errazetan moldatzen naiz.",
      B1: "Eguneroko egoera gehienetan moldatzen naiz.",
      B2: "Gai askori buruz nahiko erraz hitz egiten dut.",
      C1: "Ia edozein gairi buruz arintasunez adierazten naiz.",
      C2: "Ia dena erraz ulertzen eta adierazten dut.",
    },
  },
  gl: {
    question: "Cal é o teu nivel de catalán?",
    back: "Atrás",
    start: "Comezar",
    levels: {
      A1: "Coñezo algunhas palabras e frases sinxelas.",
      A2: "Desenvólvome en intercambios sinxelos e cotiáns.",
      B1: "Arránxome na maioría das situacións cotiás.",
      B2: "Falo de moitos temas con certa fluidez.",
      C1: "Exprésome con fluidez sobre case calquera tema.",
      C2: "Entendo e expreso case todo con facilidade.",
    },
  },
  fr: {
    // French sets a no-break space before a question mark.
    question: "Quel est ton niveau de catalan ?",
    back: "Retour",
    start: "Commencer",
    levels: {
      A1: "Je connais quelques mots et phrases simples.",
      A2: "Je me débrouille dans des échanges simples du quotidien.",
      B1: "Je m'en sors dans la plupart des situations courantes.",
      B2: "Je parle de nombreux sujets avec une certaine aisance.",
      C1: "Je m'exprime couramment sur presque tous les sujets.",
      C2: "Je comprends et j'exprime presque tout avec facilité.",
    },
  },
  de: {
    question: "Wie gut ist dein Katalanisch?",
    back: "Zurück",
    start: "Starten",
    levels: {
      A1: "Ich kenne ein paar Wörter und einfache Sätze.",
      A2: "Ich kann mich in einfachen, alltäglichen Gesprächen verständigen.",
      B1: "Ich komme in den meisten Alltagssituationen zurecht.",
      B2: "Ich spreche über viele Themen recht fließend.",
      C1: "Ich drücke mich zu fast jedem Thema fließend aus.",
      C2: "Ich verstehe fast alles und drücke mich mühelos aus.",
    },
  },
};
