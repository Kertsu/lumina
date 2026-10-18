export type TranslationId = "web" | "adb";

export type Verse = {
    id: string;
    book: string;
    bookId: number;
    chapter: number;
    verse: number;
    text: string;
    translation: TranslationId;
    edition?: string;
};

export const translations = [
    {
        id: "web" as const,
        name: "World English Bible",
        shortName: "WEB",
        language: "English",
        description:
            "Public domain · Protestant canon · Selected demo passages",
    },
    {
        id: "adb" as const,
        name: "Ang Dating Biblia",
        shortName: "ADB",
        language: "Tagalog",
        description: "Public domain · 1905 · Selected demo passages",
    },
];

// Limited, in-memory demo fixtures. These passages are not a complete Bible.
// Scripture wording is retained; search normalization never rewrites display text.
const johnWeb = [
    "Now there was a man of the Pharisees named Nicodemus, a ruler of the Jews.",
    "The same came to him by night and said to him, “Rabbi, we know that you are a teacher come from God, for no one can do these signs that you do, unless God is with him.”",
    "Jesus answered him, “Most certainly, I tell you, unless one is born anew, he can’t see God’s Kingdom.”",
    "Nicodemus said to him, “How can a man be born when he is old? Can he enter a second time into his mother’s womb, and be born?”",
    "Jesus answered, “Most certainly I tell you, unless one is born of water and spirit, he can’t enter into God’s Kingdom.",
    "That which is born of the flesh is flesh. That which is born of the Spirit is spirit.",
    "Don’t marvel that I said to you, ‘You must be born anew.’",
    "The wind blows where it wants to, and you hear its sound, but don’t know where it comes from and where it is going. So is everyone who is born of the Spirit.”",
    "Nicodemus answered him, “How can these things be?”",
    "Jesus answered him, “Are you the teacher of Israel, and don’t understand these things?",
    "Most certainly I tell you, we speak that which we know, and testify of that which we have seen, and you don’t receive our witness.",
    "If I told you earthly things and you don’t believe, how will you believe if I tell you heavenly things?",
    "No one has ascended into heaven but he who descended out of heaven, the Son of Man, who is in heaven.",
    "As Moses lifted up the serpent in the wilderness, even so must the Son of Man be lifted up,",
    "that whoever believes in him should not perish, but have eternal life.",
    "For God so loved the world, that he gave his one and only Son, that whoever believes in him should not perish, but have eternal life.",
    "For God didn’t send his Son into the world to judge the world, but that the world should be saved through him.",
    "He who believes in him is not judged. He who doesn’t believe has been judged already, because he has not believed in the name of the one and only Son of God.",
    "This is the judgment, that the light has come into the world, and men loved the darkness rather than the light, for their works were evil.",
    "For everyone who does evil hates the light and doesn’t come to the light, lest his works would be exposed.",
    "But he who does the truth comes to the light, that his works may be revealed, that they have been done in God.”",
    "After these things, Jesus came with his disciples into the land of Judea. He stayed there with them and baptized.",
    "John also was baptizing in Enon near Salim, because there was much water there. They came and were baptized;",
    "for John was not yet thrown into prison.",
    "Therefore a dispute arose on the part of John’s disciples with some Jews about purification.",
    "They came to John and said to him, “Rabbi, he who was with you beyond the Jordan, to whom you have testified, behold, he baptizes, and everyone is coming to him.”",
    "John answered, “A man can receive nothing unless it has been given him from heaven.",
    "You yourselves testify that I said, ‘I am not the Christ,’ but, ‘I have been sent before him.’",
    "He who has the bride is the bridegroom; but the friend of the bridegroom, who stands and hears him, rejoices greatly because of the bridegroom’s voice. This, my joy, therefore is made full.",
    "He must increase, but I must decrease.",
    "He who comes from above is above all. He who is from the earth belongs to the earth and speaks of the earth. He who comes from heaven is above all.",
    "What he has seen and heard, of that he testifies; and no one receives his witness.",
    "He who has received his witness has set his seal to this, that God is true.",
    "For he whom God has sent speaks the words of God; for God gives the Spirit without measure.",
    "The Father loves the Son, and has given all things into his hand.",
    "One who believes in the Son has eternal life, but one who disobeys the Son won’t see life, but the wrath of God remains on him.”",
];

const johnAdb = [
    "May isang lalake nga sa mga Fariseo, na nagngangalang Nicodemo, isang pinuno ng mga Judio:",
    "Ito rin ay naparoon sa kaniya nang gabi, at sa kaniya'y nagsabi, Rabi, nalalaman naming ikaw ay isang guro na nagbuhat sa Dios; sapagka't walang makagagawa ng mga tanda na iyong ginagawa, maliban na kung sumasa kaniya ang Dios.",
    "Sumagot si Jesus at sa kaniya'y sinabi, Katotohanan, katotohanang sinasabi ko sa iyo, Maliban na ang tao'y ipanganak na muli, ay hindi siya makakakita ng kaharian ng Dios.",
    "Sinabi sa kaniya ni Nicodemo, Paanong maipanganganak ang tao kung siya'y matanda na? makapapasok baga siyang muli sa tiyan ng kaniyang ina, at ipanganak?",
    "Sumagot si Jesus, Katotohanan, katotohanang sinasabi ko sa iyo, Maliban na ang tao'y ipanganak ng tubig at ng Espiritu, ay hindi siya makapapasok sa kaharian ng Dios.",
    "Ang ipinanganak ng laman ay laman nga; at ang ipinanganak ng Espiritu ay espiritu nga.",
    "Huwag kang magtaka sa aking sinabi sa iyo, Kinakailangan ngang kayo'y ipanganak na muli.",
    "Humihihip ang hangin kung saan niya ibig, at naririnig mo ang kaniyang ugong, nguni't hindi mo nalalaman kung saan nanggagaling, at kung saan naparoroon: gayon ang bawa't ipinanganak ng Espiritu.",
    "Sumagot si Nicodemo at sa kaniya'y sinabi, Paanong pangyayari ng mga bagay na ito?",
    "Sumagot si Jesus at sa kaniya'y sinabi, Ikaw ang guro sa Israel, at hindi mo nauunawa ang mga bagay na ito?",
    "Katotohanan, katotohanang sinasabi ko sa iyo, Ang nalalaman namin ay sinasalita namin, at ang aming nakita ay pinatototohanan namin; at hindi ninyo tinatanggap ang aming patotoo.",
    "Kung sinabi ko sa inyo ang mga bagay na nauukol sa lupa at hindi ninyo pinaniniwalaan, paanong paniniwalaan ninyo kung sabihin ko sa inyo ang mga bagay na nauukol sa langit?",
    "At walang umakyat sa langit, kundi ang nanggaling sa langit, sa makatuwid baga'y ang Anak ng tao, na nasa langit.",
    "At kung paanong itinaas ni Moises ang ahas, sa ilang, ay gayon kinakailangang itaas ang Anak ng tao;",
    "Upang ang sinomang sumampalataya ay magkaroon sa kaniya ng buhay na walang hanggan.",
    "Sapagka't gayon na lamang ang pagsinta ng Dios sa sanglibutan, na ibinigay niya ang kaniyang bugtong na Anak, upang ang sinomang sa kaniya'y sumampalataya ay huwag mapahamak, kundi magkaroon ng buhay na walang hanggan.",
    "Sapagka't hindi sinugo ng Dios ang Anak sa sanglibutan upang hatulan ang sanglibutan; kundi upang ang sanglibutan ay maligtas sa pamamagitan niya.",
    "Ang sumasampalataya sa kaniya ay hindi hinahatulan; ang hindi sumasampalataya ay hinatulan na, sapagka't hindi siya sumampalataya sa pangalan ng bugtong na Anak ng Dios.",
    "At ito ang kahatulan, na naparito ang ilaw sa sanglibutan, at inibig pa ng mga tao ang kadiliman kay sa ilaw; sapagka't masasama ang kanilang mga gawa.",
    "Sapagka't ang bawa't isa na gumagawa ng masama ay napopoot sa ilaw, at hindi lumalapit sa ilaw, upang huwag masaway ang kaniyang mga gawa.",
    "Datapuwa't ang gumagawa ng katotohanan ay lumalapit sa ilaw, upang mahayag na ang kaniyang mga gawa ay ginawa sa Dios.",
    "Pagkatapos ng mga bagay na ito ay naparoon si Jesus at ang kaniyang mga alagad sa lupain ng Judea; at doo'y tumira siya na kasama nila, at bumabautismo.",
    "At si Juan ay bumabautismo rin naman sa Enon na malapit sa Salim, sapagka't doo'y maraming tubig: at sila'y nagsisiparoon, at nangababautismuhan.",
    "Sapagka't hindi pa nabibilanggo si Juan.",
    "Nagkaroon nga ng isang pagtatalo ang mga alagad ni Juan sa isang Judio tungkol sa paglilinis.",
    "At sila'y nagsiparoon kay Juan, at sa kaniya'y sinabi, Rabi, yaong kasama mo sa dako pa roon ng Jordan, na siyang pinatotohanan mo, narito, siya'y bumabautismo, at ang lahat ng mga tao'y nagsisiparoon sa kaniya.",
    "Sumagot si Juan at sinabi, Hindi makatatanggap ng anoman ang isang tao, maliban na ito'y ipagkaloob sa kaniya mula sa langit.",
    "Kayo rin ang mangagpapatotoo sa akin, na aking sinabi, Hindi ako ang Cristo, kundi, na ako'y sinugo sa unahan niya.",
    "Ang nagtataglay ng kasintahang babae ay siyang kasintahang lalake: datapuwa't ang kaibigan ng kasintahang lalake, na nakatayo at nakikinig sa kaniya, ay nagagalak na mainam dahil sa tinig ng kasintahang lalake: ito ngang aking kagalakan ay naganap.",
    "Siya'y kinakailangang dumakila, nguni't ako'y kinakailangang bumaba.",
    "Ang nanggagaling sa itaas ay sumasa ibabaw ng lahat: ang taga lupa ay taga lupa nga, at ang ukol sa lupa ang sinasalita: ang nanggagaling sa langit ay sumasa ibabaw ng lahat.",
    "Ang kaniyang nakita at narinig, ay siyang pinatototohanan niya; at walang taong tumatanggap ng kaniyang patotoo.",
    "Ang tumatanggap ng kaniyang patotoo ay naglagay dito ng kaniyang tatak, na ang Dios ay totoo.",
    "Sapagka't ang sinugo ng Dios ay nagsasalita ng mga salita ng Dios: sapagka't hindi niya ibinibigay ang Espiritu sa pamamagitan ng sukat.",
    "Sinisinta ng Ama ang Anak, at inilagay sa kaniyang kamay ang lahat ng mga bagay.",
    "Ang sumasampalataya sa Anak ay may buhay na walang hanggan; nguni't ang hindi tumatalima sa Anak ay hindi makakakita ng buhay, kundi ang poot ng Dios ay sumasa kaniya.",
];

const psalmsWeb = [
    "Yahweh is my shepherd: I shall lack nothing.",
    "He makes me lie down in green pastures. He leads me beside still waters.",
    "He restores my soul. He guides me in the paths of righteousness for his name’s sake.",
    "Even though I walk through the valley of the shadow of death, I will fear no evil, for you are with me. Your rod and your staff, they comfort me.",
    "You prepare a table before me in the presence of my enemies. You anoint my head with oil. My cup runs over.",
    "Surely goodness and loving kindness shall follow me all the days of my life, and I will dwell in Yahweh’s house forever.",
];

const psalmsAdb = [
    "Ang Panginoon ay aking pastor; hindi ako mangangailangan.",
    "Kaniyang pinahihiga ako sa sariwang pastulan: pinapatnubayan niya ako sa siping ng mga tubig na pahingahan.",
    "Kaniyang pinapananauli ang aking kaluluwa: pinapatnubayan niya ako sa mga landas ng katuwiran alangalang sa kaniyang pangalan.",
    "Oo, bagaman ako'y lumalakad sa libis ng lilim ng kamatayan, wala akong katatakutang kasamaan; sapagka't ikaw ay sumasa akin: ang iyong pamalo at ang iyong tungkod, ay nagsisialiw sa akin.",
    "Iyong ipinaghahanda ako ng dulang sa harap ko sa harapan ng aking mga kaaway: iyong pinahiran ang aking ulo ng langis; ang aking saro ay inaapawan.",
    "Tunay na ang kabutihan at kaawaan ay susunod sa akin sa lahat ng mga kaarawan ng aking buhay: at ako'y tatahan sa bahay ng Panginoon magpakailan man.",
];

const genesisWeb = [
    "In the beginning, God created the heavens and the earth.",
    "The earth was formless and empty. Darkness was on the surface of the deep and God’s Spirit was hovering over the surface of the waters.",
    "God said, “Let there be light,” and there was light.",
    "God saw the light, and saw that it was good. God divided the light from the darkness.",
    "God called the light “day”, and the darkness he called “night”. There was evening and there was morning, the first day.",
];

const genesisAdb = [
    "Nang pasimula ay nilikha ng Dios ang langit at ang lupa.",
    "At ang lupa ay walang anyo at walang laman; at ang kadiliman ay sumasa ibabaw ng kalaliman: at ang Espiritu ng Dios ay sumasa ibabaw ng tubig.",
    "At sinabi ng Dios, Magkaroon ng liwanag; at nagkaroon ng liwanag.",
    "At nakita ng Dios ang liwanag na mabuti: at inihiwalay ng Dios ang liwanag sa kadiliman.",
    "At tinawag ng Dios ang liwanag na Araw, at tinawag niya ang kadiliman na Gabi. At nagkahapon at nagkaumaga ang unang araw.",
];

const matthewWeb = [
    "Seeing the multitudes, he went up onto the mountain. When he had sat down, his disciples came to him.",
    "He opened his mouth and taught them, saying,",
    "“Blessed are the poor in spirit, for theirs is the Kingdom of Heaven.",
    "Blessed are those who mourn, for they shall be comforted.",
    "Blessed are the gentle, for they shall inherit the earth.",
    "Blessed are those who hunger and thirst after righteousness, for they shall be filled.",
    "Blessed are the merciful, for they shall obtain mercy.",
    "Blessed are the pure in heart, for they shall see God.",
    "Blessed are the peacemakers, for they shall be called children of God.",
];

const matthewAdb = [
    "At pagkakita sa mga karamihan, ay umahon siya sa bundok: at pagkaupo niya, ay nagsilapit sa kaniya ang kaniyang mga alagad:",
    "At binuka niya ang kaniyang bibig at tinuruan sila, na sinasabi,",
    "Mapapalad ang mga mapagpakumbabang-loob: sapagka't kanila ang kaharian ng langit.",
    "Mapapalad ang nangahahapis: sapagka't sila'y aaliwin.",
    "Mapapalad ang maaamo: sapagka't mamanahin nila ang lupa.",
    "Mapapalad ang nangagugutom at nangauuhaw sa katuwiran: sapagka't sila'y bubusugin.",
    "Mapapalad ang mga mahabagin: sapagka't sila'y kahahabagan.",
    "Mapapalad ang mga may malinis na puso: sapagka't makikita nila ang Dios.",
    "Mapapalad ang mga mapagpayapa: sapagka't sila'y tatawaging mga anak ng Dios.",
];

function chapterRows(
    book: string,
    bookId: number,
    chapter: number,
    text: string[],
    translation: TranslationId,
    start = 1
): Verse[] {
    return text.map((content, index) => ({
        id: `${translation}-${bookId}-${chapter}-${index + start}`,
        book,
        bookId,
        chapter,
        verse: index + start,
        text: content,
        translation,
        edition: `${translation}-demo-1`,
    }));
}

export const verses: Verse[] = [
    ...chapterRows("Genesis", 1, 1, genesisWeb, "web"),
    ...chapterRows("Genesis", 1, 1, genesisAdb, "adb"),
    ...chapterRows("Psalms", 19, 23, psalmsWeb, "web"),
    ...chapterRows("Psalms", 19, 23, psalmsAdb, "adb"),
    ...chapterRows("Matthew", 40, 5, matthewWeb, "web"),
    ...chapterRows("Matthew", 40, 5, matthewAdb, "adb"),
    ...chapterRows("John", 43, 3, johnWeb, "web"),
    ...chapterRows("John", 43, 3, johnAdb, "adb"),
    ...chapterRows(
        "Romans",
        45,
        8,
        [
            "We know that all things work together for good for those who love God, for those who are called according to his purpose.",
        ],
        "web",
        28
    ),
    ...chapterRows(
        "Romans",
        45,
        8,
        [
            "At nalalaman natin na ang lahat ng mga bagay ay nagkakalakip na gumagawa sa ikabubuti ng mga nagsisiibig sa Dios, sa makatuwid baga'y niyaong mga tinawag alinsunod sa kaniyang nasa.",
        ],
        "adb",
        28
    ),
    ...chapterRows(
        "1 Corinthians",
        46,
        13,
        [
            "Love is patient and is kind. Love doesn’t envy. Love doesn’t brag, is not proud,",
            "doesn’t behave itself inappropriately, doesn’t seek its own way, is not provoked, takes no account of evil;",
            "doesn’t rejoice in unrighteousness, but rejoices with the truth;",
            "bears all things, believes all things, hopes all things, and endures all things.",
        ],
        "web",
        4
    ),
    ...chapterRows(
        "1 Corinthians",
        46,
        13,
        [
            "Ang pagibig ay mapagpahinuhod, at magandang-loob; ang pagibig ay hindi nananaghili; ang pagibig ay hindi nagmamapuri, hindi mapagpalalo,",
            "Hindi naguugaling mahalay, hindi hinahanap ang kaniyang sarili, hindi nayayamot, hindi inaalumana ang masama;",
            "Hindi nagagalak sa kalikuan, kundi nakikigalak sa katotohanan;",
            "Lahat ay binabata, lahat ay pinaniniwalaan, lahat ay inaasahan, lahat ay tinitiis.",
        ],
        "adb",
        4
    ),
    ...chapterRows(
        "Philippians",
        50,
        4,
        ["I can do all things through Christ, who strengthens me."],
        "web",
        13
    ),
    ...chapterRows(
        "Philippians",
        50,
        4,
        ["Lahat ng mga bagay ay aking magagawa doon sa nagpapalakas sa akin."],
        "adb",
        13
    ),
].sort(
    (left, right) =>
        left.bookId - right.bookId ||
        left.chapter - right.chapter ||
        left.verse - right.verse
);

const tagalogNames: Record<string, string> = {
    Genesis: "Genesis",
    Psalms: "Mga Awit",
    Matthew: "Mateo",
    John: "Juan",
    Romans: "Roma",
    "1 Corinthians": "1 Corinto",
    Philippians: "Filipos",
};

export function referenceLabel(verse: Verse): string {
    const book =
        verse.translation === "adb"
            ? (tagalogNames[verse.book] ?? verse.book)
            : verse.book;
    return `${book} ${verse.chapter}:${verse.verse}`;
}

// Illustrative editorial metadata for evaluating the book-information layout.
// Attribution remains visible so this is never mistaken for translation data.
export const bookMetadata: Record<
    string,
    {
        name: string;
        author: string;
        date: string;
        location: string;
        attribution: string;
    }
> = {
    John: {
        name: "The Gospel according to John",
        author: "Traditionally attributed to John the Apostle",
        date: "c. AD 90–100 · traditional estimate",
        location: "Ephesus · traditional attribution",
        attribution: "Lumina illustrative demo notes · not Bible text",
    },
    Psalms: {
        name: "The Book of Psalms",
        author: "Multiple authors; Psalm 23 attributed to David",
        date: "Collected across several centuries",
        location: "Ancient Israel",
        attribution: "Lumina illustrative demo notes · not Bible text",
    },
    Genesis: {
        name: "The Book of Genesis",
        author: "Traditionally attributed to Moses",
        date: "Information unavailable",
        location: "Information unavailable",
        attribution: "Lumina illustrative demo notes · not Bible text",
    },
    Matthew: {
        name: "The Gospel according to Matthew",
        author: "Traditionally attributed to Matthew",
        date: "Information unavailable",
        location: "Information unavailable",
        attribution: "Lumina illustrative demo notes · not Bible text",
    },
    Romans: {
        name: "The Letter to the Romans",
        author: "Paul the Apostle",
        date: "c. AD 57 · traditional estimate",
        location: "Corinth · traditional attribution",
        attribution: "Lumina illustrative demo notes · not Bible text",
    },
    "1 Corinthians": {
        name: "The First Letter to the Corinthians",
        author: "Paul the Apostle",
        date: "c. AD 55 · traditional estimate",
        location: "Ephesus · traditional attribution",
        attribution: "Lumina illustrative demo notes · not Bible text",
    },
    Philippians: {
        name: "The Letter to the Philippians",
        author: "Paul the Apostle",
        date: "Information unavailable",
        location: "Written during imprisonment · location debated",
        attribution: "Lumina illustrative demo notes · not Bible text",
    },
};
