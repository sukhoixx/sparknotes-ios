import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as Speech from "expo-speech";

import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
  TextInput,
  Keyboard,
  Animated,
  Linking,
  Share,
  Image,
  Platform,
  Modal,
} from "react-native";
import { PanGestureHandler, TapGestureHandler, State } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import WebView from "react-native-webview";
import { BannerAd, BannerAdSize, TestIds } from "react-native-google-mobile-ads";
import { useTheme } from "../theme";
import { useLang, toSimplified } from "../lang";
import { t } from "../i18n";
import type { Colors } from "../theme";
import type { Post, Comment } from "../types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchComments, postComment, fetchOgImage } from "../api";


const DOMAIN_NAMES: Record<string, string> = {
  // US news / politics
  "bloomberg.com": "Bloomberg",
  "reuters.com": "Reuters",
  "apnews.com": "AP News",
  "nytimes.com": "NY Times",
  "washingtonpost.com": "Washington Post",
  "wsj.com": "Wall Street Journal",
  "cnn.com": "CNN",
  "foxnews.com": "Fox News",
  "nbcnews.com": "NBC News",
  "cbsnews.com": "CBS News",
  "go.com": "ABC News",
  "msnbc.com": "MSNBC",
  "usatoday.com": "USA Today",
  "nypost.com": "NY Post",
  "latimes.com": "LA Times",
  "chicagotribune.com": "Chicago Tribune",
  "bostonglobe.com": "Boston Globe",
  "sfgate.com": "SF Gate",
  "seattletimes.com": "Seattle Times",
  "politico.com": "Politico",
  "thehill.com": "The Hill",
  "axios.com": "Axios",
  "vox.com": "Vox",
  "theatlantic.com": "The Atlantic",
  "newyorker.com": "The New Yorker",
  "time.com": "TIME",
  "newsweek.com": "Newsweek",
  "huffpost.com": "HuffPost",
  "slate.com": "Slate",
  "thedailybeast.com": "The Daily Beast",
  "theweek.com": "The Week",
  "motherjones.com": "Mother Jones",
  "theintercept.com": "The Intercept",
  "thenation.com": "The Nation",
  "nationalreview.com": "National Review",
  "realclearpolitics.com": "RealClearPolitics",
  "rollcall.com": "Roll Call",
  "talkingpointsmemo.com": "Talking Points Memo",
  "governing.com": "Governing",
  "propublica.org": "ProPublica",
  "npr.org": "NPR",
  "yahoo.com": "Yahoo News",
  // US business / finance
  "businessinsider.com": "Business Insider",
  "forbes.com": "Forbes",
  "fortune.com": "Fortune",
  "cnbc.com": "CNBC",
  "marketwatch.com": "MarketWatch",
  "inc.com": "Inc.",
  "fastcompany.com": "Fast Company",
  "entrepreneur.com": "Entrepreneur",
  "hbr.org": "Harvard Business Review",
  "fool.com": "Motley Fool",
  "kiplinger.com": "Kiplinger",
  "seekingalpha.com": "Seeking Alpha",
  "investopedia.com": "Investopedia",
  "thestreet.com": "TheStreet",
  "nerdwallet.com": "NerdWallet",
  "bankrate.com": "Bankrate",
  "thebalancemoney.com": "The Balance",
  "money.com": "Money",
  "qz.com": "Quartz",
  "zacks.com": "Zacks",
  "finance.yahoo.com": "Yahoo Finance",
  // UK
  "bbc.com": "BBC",
  "bbc.co.uk": "BBC",
  "theguardian.com": "The Guardian",
  "independent.co.uk": "The Independent",
  "telegraph.co.uk": "The Telegraph",
  "thetimes.co.uk": "The Times",
  "ft.com": "Financial Times",
  "economist.com": "The Economist",
  "dailymail.co.uk": "Daily Mail",
  "mirror.co.uk": "The Mirror",
  "express.co.uk": "Daily Express",
  "sky.com": "Sky News",
  "thesun.co.uk": "The Sun",
  "standard.co.uk": "Evening Standard",
  // Europe / international broadcasters
  "aljazeera.com": "Al Jazeera",
  "dw.com": "DW",
  "france24.com": "France 24",
  "euronews.com": "Euronews",
  "rfi.fr": "RFI",
  "swissinfo.ch": "SWI",
  "foreignpolicy.com": "Foreign Policy",
  "thediplomat.com": "The Diplomat",
  "nationalinterest.org": "National Interest",
  // Australia / NZ
  "abc.net.au": "ABC Australia",
  "smh.com.au": "Sydney Morning Herald",
  "theaustralian.com.au": "The Australian",
  "afr.com": "AFR",
  "rnz.co.nz": "RNZ",
  // Canada
  "cbc.ca": "CBC",
  "globeandmail.com": "Globe and Mail",
  "thestar.com": "Toronto Star",
  "nationalpost.com": "National Post",
  // India
  "indiatimes.com": "Times of India",
  "hindustantimes.com": "Hindustan Times",
  "thehindu.com": "The Hindu",
  "ndtv.com": "NDTV",
  "indianexpress.com": "Indian Express",
  // Asia / Pacific
  "scmp.com": "SCMP",
  "hongkongfp.com": "HK Free Press",
  "taipeitimes.com": "Taipei Times",
  "straitstimes.com": "Straits Times",
  "channelnewsasia.com": "CNA",
  "businesstimes.com.sg": "Business Times",
  "japantimes.co.jp": "Japan Times",
  "koreatimes.co.kr": "Korea Times",
  "hani.co.kr": "Hankyoreh",
  "yna.co.kr": "Yonhap",
  // Russia / China
  "themoscowtimes.com": "Moscow Times",
  "meduza.io": "Meduza",
  "tass.com": "TASS",
  "xinhuanet.com": "Xinhua",
  "chinadaily.com.cn": "China Daily",
  "globaltimes.cn": "Global Times",
  "cgtn.com": "CGTN",
  // Tech
  "techcrunch.com": "TechCrunch",
  "wired.com": "Wired",
  "theverge.com": "The Verge",
  "arstechnica.com": "Ars Technica",
  "engadget.com": "Engadget",
  "9to5mac.com": "9to5Mac",
  "macrumors.com": "MacRumors",
  "venturebeat.com": "VentureBeat",
  "cnet.com": "CNET",
  "zdnet.com": "ZDNet",
  "gizmodo.com": "Gizmodo",
  "mashable.com": "Mashable",
  "techradar.com": "TechRadar",
  "digitaltrends.com": "Digital Trends",
  "tomsguide.com": "Tom's Guide",
  "tomshardware.com": "Tom's Hardware",
  "androidauthority.com": "Android Authority",
  "thenextweb.com": "TNW",
  "ieee.org": "IEEE Spectrum",
  "technologyreview.com": "MIT Technology Review",
  "hackaday.com": "Hackaday",
  "newatlas.com": "New Atlas",
  "singularityhub.com": "Singularity Hub",
  "futurism.com": "Futurism",
  "interestingengineering.com": "Interesting Engineering",
  "techxplore.com": "TechXplore",
  // Science
  "nature.com": "Nature",
  "science.org": "Science",
  "sciencenews.org": "Science News",
  "newscientist.com": "New Scientist",
  "scientificamerican.com": "Scientific American",
  "livescience.com": "Live Science",
  "nasa.gov": "NASA",
  "nationalgeographic.com": "Nat Geo",
  "smithsonianmag.com": "Smithsonian",
  "sciencedaily.com": "Science Daily",
  "sciencealert.com": "ScienceAlert",
  "phys.org": "Phys.org",
  "cosmosmagazine.com": "Cosmos",
  "iflscience.com": "IFLScience",
  "discovermagazine.com": "Discover",
  "eurekalert.org": "EurekAlert",
  "quantamagazine.org": "Quanta",
  "zmescience.com": "ZME Science",
  "space.com": "Space.com",
  "spaceflightnow.com": "Spaceflight Now",
  "theconversation.com": "The Conversation",
  "mit.edu": "MIT News",
  "mongabay.com": "Mongabay",
  // Health
  "healthline.com": "Healthline",
  "webmd.com": "WebMD",
  "nih.gov": "NIH",
  "cdc.gov": "CDC",
  "who.int": "WHO",
  "mayoclinic.org": "Mayo Clinic",
  "medicalnewstoday.com": "Medical News Today",
  "everydayhealth.com": "Everyday Health",
  "medpagetoday.com": "MedPage Today",
  "verywellhealth.com": "Verywell Health",
  "psychologytoday.com": "Psychology Today",
  "prevention.com": "Prevention",
  "mindful.org": "Mindful",
  "runnersworld.com": "Runner's World",
  "menshealth.com": "Men's Health",
  "self.com": "SELF",
  "shape.com": "Shape",
  "harvard.edu": "Harvard Health",
  "womenshealthmag.com": "Women's Health",
  // Entertainment
  "variety.com": "Variety",
  "hollywoodreporter.com": "Hollywood Reporter",
  "deadline.com": "Deadline",
  "rollingstone.com": "Rolling Stone",
  "ew.com": "Entertainment Weekly",
  "pitchfork.com": "Pitchfork",
  "collider.com": "Collider",
  "indiewire.com": "IndieWire",
  "avclub.com": "AV Club",
  "screenrant.com": "Screen Rant",
  "thewrap.com": "The Wrap",
  "tvline.com": "TVLine",
  "vulture.com": "Vulture",
  "uproxx.com": "Uproxx",
  "consequence.net": "Consequence",
  "pastemagazine.com": "Paste",
  // Celebrity
  "people.com": "People",
  "tmz.com": "TMZ",
  "pagesix.com": "Page Six",
  "celebitchy.com": "Celebitchy",
  "justjared.com": "Just Jared",
  "hellomagazine.com": "Hello!",
  "hollywoodlife.com": "Hollywood Life",
  "perezhilton.com": "Perez Hilton",
  "intouchweekly.com": "In Touch Weekly",
  "okmagazine.com": "OK!",
  "usmagazine.com": "US Weekly",
  "radaronline.com": "Radar Online",
  "starmagazine.com": "Star Magazine",
  "eonline.com": "E! Online",
  "etonline.com": "ET Online",
  "popsugar.com": "PopSugar",
  "teenvogue.com": "Teen Vogue",
  "accessonline.com": "Access",
  // Sports
  "espn.com": "ESPN",
  "si.com": "Sports Illustrated",
  "bleacherreport.com": "Bleacher Report",
  "sbnation.com": "SB Nation",
  "theathletic.com": "The Athletic",
  "cbssports.com": "CBS Sports",
  "nbcsports.com": "NBC Sports",
  "deadspin.com": "Deadspin",
  "sportingnews.com": "Sporting News",
  "fansided.com": "FanSided",
  "skysports.com": "Sky Sports",
  "outsideonline.com": "Outside",
  // Gaming
  "ign.com": "IGN",
  "gamespot.com": "GameSpot",
  "kotaku.com": "Kotaku",
  "polygon.com": "Polygon",
  "pcgamer.com": "PC Gamer",
  "eurogamer.net": "Eurogamer",
  "destructoid.com": "Destructoid",
  "dualshockers.com": "DualShockers",
  "siliconera.com": "Siliconera",
  "rockpapershotgun.com": "Rock Paper Shotgun",
  "nintendolife.com": "Nintendo Life",
  "purexbox.com": "Pure Xbox",
  "pushsquare.com": "Push Square",
  "vg247.com": "VG247",
  "toucharcade.com": "TouchArcade",
  "gamesindustry.biz": "GamesIndustry.biz",
  "videogameschronicle.com": "VGC",
  // Travel
  "travelandleisure.com": "Travel + Leisure",
  "cntraveler.com": "Condé Nast Traveler",
  "lonelyplanet.com": "Lonely Planet",
  "atlasobscura.com": "Atlas Obscura",
  "afar.com": "AFAR",
  "fodors.com": "Fodor's",
  "frommers.com": "Frommer's",
  "matadornetwork.com": "Matador",
  "nomadicmatt.com": "Nomadic Matt",
  "ricksteves.com": "Rick Steves",
  "smartertravel.com": "Smarter Travel",
  "skift.com": "Skift",
  "thepointsguy.com": "The Points Guy",
  // Beauty / fashion
  "vogue.com": "Vogue",
  "elle.com": "Elle",
  "allure.com": "Allure",
  "cosmopolitan.com": "Cosmopolitan",
  "harpersbazaar.com": "Harper's Bazaar",
  "glamour.com": "Glamour",
  "instyle.com": "InStyle",
  "nylon.com": "Nylon",
  "refinery29.com": "Refinery29",
  "byrdie.com": "Byrdie",
  "fashionista.com": "Fashionista",
  "thecut.com": "The Cut",
  "coveteur.com": "Coveteur",
  "intothegloss.com": "Into The Gloss",
  "whohatwear.com": "Who What Wear",
  "glossy.co": "Glossy",
  // Military / defense
  "militarytimes.com": "Military Times",
  "defensenews.com": "Defense News",
  "defenseone.com": "Defense One",
  "breakingdefense.com": "Breaking Defense",
  "taskandpurpose.com": "Task & Purpose",
  "stripes.com": "Stars and Stripes",
  "airforcetimes.com": "Air Force Times",
  "armytimes.com": "Army Times",
  "navytimes.com": "Navy Times",
  "marinecorpstimes.com": "Marine Corps Times",
  "c4isrnet.com": "C4ISRNET",
  "lawfaremedia.org": "Lawfare",
  "smallwarsjournal.com": "Small Wars Journal",
  "usni.org": "USNI News",
  // Animals
  "thedodo.com": "The Dodo",
  "aspca.org": "ASPCA",
  "audubon.org": "Audubon",
  "bornfree.org.uk": "Born Free",
  "defenders.org": "Defenders of Wildlife",
  "janegoodall.org": "Jane Goodall",
  "onegreenplanet.org": "One Green Planet",
  "worldwildlife.org": "WWF",
};

function getSourceName(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const parts = host.split(".");
    for (let i = 0; i < parts.length - 1; i++) {
      const candidate = parts.slice(i).join(".");
      if (DOMAIN_NAMES[candidate]) return DOMAIN_NAMES[candidate];
    }
    return (parts[parts.length - 2] ?? parts[0])
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  } catch {
    return null;
  }
}

const REACTIONS = ["😮", "❤️", "😂", "😢", "😡", "👍"] as const;
const PICKER_WIDTH = REACTIONS.length * 48 + 16;

interface Props {
  post: Post | null;
  reaction: string | null;
  onClose: () => void;
  onReact: (emoji: string | null) => void;
  isAuthenticated: boolean;
  onSignInRequired: () => void;
  autoRead: boolean;
  onToggleAutoRead: () => void;
}

function renderHtmlAsText(html: string, color: string, boldColor: string, fontSize: number, lineHeight: number) {
  const paragraphs = html
    .split(/<\/p>/i)
    .map(p => p.replace(/<p[^>]*>/i, '').trim())
    .filter(Boolean);

  return paragraphs.map((para, i) => {
    const parts = para.split(/(<strong>.*?<\/strong>)/gi);
    const spans = parts.map((part, j) => {
      const boldMatch = part.match(/^<strong>(.*?)<\/strong>$/i);
      if (boldMatch) {
        const text = boldMatch[1].replace(/<[^>]*>/g, '');
        return (
          <Text key={j} style={{ fontWeight: '700', color: boldColor }}>{text}</Text>
        );
      }
      const text = part.replace(/<[^>]*>/g, '');
      if (!text) return null;
      return (
        <Text key={j} style={{ fontWeight: '400', color }}>{text}</Text>
      );
    }).filter(Boolean);

    return (
      <Text key={i} selectable style={{ fontSize, lineHeight, marginBottom: 12, color }}>
        {spans}
      </Text>
    );
  });
}

function ArticleBodyWebView({
  html,
  textColor,
  strongColor,
  bgColor,
  fontSize = 15,
  lineHeight = 24,
  width,
  onDoubleTap,
}: {
  html: string;
  textColor: string;
  strongColor: string;
  bgColor: string;
  fontSize?: number;
  lineHeight?: number;
  width: number;
  onDoubleTap?: () => void;
}) {
  const [height, setHeight] = useState(800);
  const styledHtml = `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { overflow: visible; }
body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background-color: ${bgColor}; -webkit-user-select: text; user-select: text; }
p { color: ${textColor}; font-size: ${fontSize}px; line-height: ${lineHeight}px; margin-bottom: 12px; }
strong { color: ${strongColor}; font-weight: 700; }
</style></head><body>${html}</body></html>`;

  const injectedJS = `
    function sendHeight() {
      var h = document.body.scrollHeight || document.documentElement.scrollHeight;
      if (h > 1) window.ReactNativeWebView.postMessage(JSON.stringify({type:'height',value:h+1}));
    }
    sendHeight();
    setTimeout(sendHeight, 100);
    setTimeout(sendHeight, 500);
    var _lastTap=0;
    document.addEventListener('touchend',function(e){
      var now=Date.now();
      if(now-_lastTap<300){window.ReactNativeWebView.postMessage(JSON.stringify({type:'doubletap'}));e.preventDefault();}
      _lastTap=now;
    },true);
    true;
  `;

  function handleMessage(e: any) {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === "height") setHeight(msg.value);
      else if (msg.type === "doubletap") onDoubleTap?.();
    } catch {
      setHeight(Number(e.nativeEvent.data));
    }
  }

  return (
    <WebView
      source={{ html: styledHtml }}
      scrollEnabled={false}
      style={{ width, height, backgroundColor: bgColor }}
      onMessage={handleMessage}
      injectedJavaScript={injectedJS}
      javaScriptEnabled={true}
      originWhitelist={["*"]}
      showsVerticalScrollIndicator={false}
      onLoad={() => {
        // Fallback: set a reasonable height if postMessage never fires
        setTimeout(() => {
          setHeight((h) => h === 200 ? 400 : h);
        }, 1000);
      }}
    />
  );
}

function HeroImage({ lowRes, highRes, width }: { lowRes?: string; highRes?: string; width: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  function onHighResLoad() {
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }

  const imageStyle = { width, height: 200, borderRadius: 12, marginBottom: 16 };

  return (
    <View style={imageStyle}>
      {!!lowRes && (
        <Image source={{ uri: lowRes }} style={[imageStyle, { position: "absolute" }]} resizeMode="cover" />
      )}
      {!!highRes && (
        <Animated.Image
          source={{ uri: highRes }}
          style={[imageStyle, { position: "absolute", opacity: fadeAnim }]}
          resizeMode="cover"
          onLoad={onHighResLoad}
        />
      )}
    </View>
  );
}

const iosVoiceCache: Record<string, string | undefined> = {};
async function getPreferredVoice(locale: string): Promise<string | undefined> {
  if (Platform.OS !== "ios") return undefined;
  if (locale in iosVoiceCache) return iosVoiceCache[locale];
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const qualityRank: Record<string, number> = { Default: 0, Enhanced: 1, Premium: 2 };
    const isZh = locale.startsWith("zh");
    const candidates = voices
      .filter((v) => (isZh ? v.language.startsWith("zh") : v.language.startsWith(locale.slice(0, 5))) && !v.identifier.includes("super-compact") && !v.identifier.includes("speech.synthesis"))
      .sort((a, b) => (qualityRank[b.quality] ?? 0) - (qualityRank[a.quality] ?? 0));
    const match = candidates[0];
    iosVoiceCache[locale] = match?.identifier;
    return match?.identifier;
  } catch {
    return undefined;
  }
}

function stripHtmlForSpeech(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\s{2,}/g, " ").trim();
}

export function ArticleSheet({
  post,
  reaction,
  onClose,
  onReact,
  isAuthenticated,
  onSignInRequired,
  autoRead,
  onToggleAutoRead,
}: Props) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { lang } = useLang();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const displayTitle = post
    ? (lang !== "en" && post.zhTitle
        ? (lang === "zh-CN" ? (post.zhTitleCn ?? toSimplified(post.zhTitle)) : post.zhTitle)
        : post.title).trim()
    : "";

  const displayBody = post
    ? (lang !== "en" && post.zhBody
        ? (lang === "zh-CN" ? (post.zhBodyCn ?? toSimplified(post.zhBody)) : post.zhBody)
        : post.body)
    : "";

  const displayFunFact = post
    ? (lang !== "en" && post.zhFunFact
        ? (lang === "zh-CN" ? (post.zhFunFactCn ?? toSimplified(post.zhFunFact)) : post.zhFunFact)
        : post.funFact)
    : "";

  const translateX = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.88)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const doubleTapRef = useRef(null);
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;
  const autoReadToastOpacity = useRef(new Animated.Value(0)).current;
  const adOpacity = useRef(new Animated.Value(0)).current;

  const reactionEntries = useMemo(() => {
    const r = { ...(post?.reactions ?? {}) };
    if (reaction && !r[reaction]) r[reaction] = 1;
    return Object.entries(r).filter(([, n]) => n > 0);
  }, [post?.reactions, reaction]);

  const [autoReadToastMsg, setAutoReadToastMsg] = useState("");
  const [voiceHelpVisible, setVoiceHelpVisible] = useState(false);
  const [fontSizeIdx, setFontSizeIdx] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem("fontSizeIdx").then((v) => { if (v !== null) setFontSizeIdx(Number(v)); });
  }, []);

  function cycleFontSize() {
    setFontSizeIdx((i) => {
      const next = (i + 1) % FONT_SIZES.length;
      AsyncStorage.setItem("fontSizeIdx", String(next));
      return next;
    });
  }
  const commentInputRef = useRef<TextInput>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerPos, setPickerPos] = useState({ x: 0, y: 0 });
  const reactionBtnRef = useRef<View>(null);
  const pickerAnim = useRef(new Animated.Value(0)).current;

  function showPicker() {
    if (!isAuthenticated) { onSignInRequired(); return; }
    reactionBtnRef.current?.measureInWindow((x, y, w) => {
      const cx = x + w / 2 - PICKER_WIDTH / 2;
      const clampedX = Math.min(Math.max(8, cx), width - PICKER_WIDTH - 8);
      setPickerPos({ x: clampedX, y: y - 60 });
      setPickerVisible(true);
      pickerAnim.setValue(0);
      Animated.spring(pickerAnim, { toValue: 1, useNativeDriver: true, bounciness: 10, speed: 18 }).start();
    });
  }

  function hidePicker() {
    Animated.timing(pickerAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setPickerVisible(false));
  }

  function handleReactSelect(emoji: string) {
    onReact(reaction === emoji ? null : emoji);
    hidePicker();
  }
  const FONT_SIZES = [
    { body: 15, line: 24 },
    { body: 18, line: 28 },
    { body: 21, line: 32 },
  ] as const;

  function triggerAutoReadToast(msg: string) {
    autoReadToastOpacity.stopAnimation();
    autoReadToastOpacity.setValue(0);
    setAutoReadToastMsg(msg);
    requestAnimationFrame(() => {
      autoReadToastOpacity.setValue(1);
      Animated.sequence([
        Animated.delay(2000),
        Animated.timing(autoReadToastOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    });
  }

  function triggerLikeAnimation() {
    if (!reaction) onReact("❤️");
    heartScale.setValue(0);
    heartOpacity.setValue(1);
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, bounciness: 12 }),
      Animated.delay(350),
      Animated.timing(heartOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }

  function onDoubleTap({ nativeEvent }: any) {
    if (nativeEvent.state !== State.ACTIVE) return;
    triggerLikeAnimation();
  }

  useLayoutEffect(() => {
    if (post) {
      translateX.setValue(0);
      scale.setValue(0.88);
      opacity.setValue(0);
      adOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, bounciness: 0, speed: 18 }),
        Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }),
      ]).start();
    }
  }, [post?.id]);

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

  function handleClose() {
    Animated.parallel([
      Animated.timing(scale, { toValue: 0.88, duration: 200, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onClose());
  }

  function onHandlerStateChange({ nativeEvent }: any) {
    if (nativeEvent.state === State.END || nativeEvent.state === State.CANCELLED) {
      const { translationX, velocityX } = nativeEvent;
      if (Math.abs(translationX) > 80 || Math.abs(velocityX) > 600) {
        Animated.timing(translateX, {
          toValue: translationX > 0 ? width : -width,
          duration: 180,
          useNativeDriver: true,
        }).start(() => onClose());
      } else {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      }
    }
  }

  useEffect(() => {
    if (autoRead && post) {
      const title = displayTitle;
      const body = stripHtmlForSpeech(displayBody);
      const fact = displayFunFact ? stripHtmlForSpeech(displayFunFact) : "";
      const text = [title, body, fact].filter(Boolean).join(". ");
      const locale = lang === "zh-TW" ? "zh-TW" : lang === "zh-CN" ? "zh-CN" : "en-US";
      (async () => {
        const voiceId = await getPreferredVoice(locale);
        // Note: silent mode override not available in SDK 55 (expo-av removed)
        Speech.speak(text, {
          language: locale,
          rate: 0.95,
          ...(voiceId ? { voice: voiceId } : {}),
        });
      })();
    } else {
      Speech.stop();
    }
    return () => { Speech.stop(); };
  }, [post?.id, autoRead]);

  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    const show = Keyboard.addListener("keyboardWillShow", (e) => setKeyboardHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener("keyboardWillHide", () => setKeyboardHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const [ogImage, setOgImage] = useState<string | null>(null);

  useEffect(() => {
    if (!post?.sourceUrl) { setOgImage(null); return; }
    setOgImage(null);
    fetchOgImage(post.sourceUrl).then(setOgImage);
  }, [post?.id]);


  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!post) {
      setComments([]);
      return;
    }
    setCommentsLoading(true);
    fetchComments(post.id).then((c) => {
      setComments(c);
      setCommentsLoading(false);
    });
  }, [post?.id]);

  async function handleComment() {
    if (!post || !commentText.trim() || submitting) return;
    if (!isAuthenticated) { onSignInRequired(); return; }
    setSubmitting(true);
    const comment = await postComment(post.id, commentText.trim());
    if (comment) {
      setComments((prev) => [comment, ...prev]);
      setCommentText("");
      commentInputRef.current?.blur();
      Keyboard.dismiss();

    }
    setSubmitting(false);
  }

  const contentWidth = width - 32;

  return (
    <View pointerEvents={post ? "auto" : "none"} style={StyleSheet.absoluteFillObject}>
    <PanGestureHandler
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
      activeOffsetX={[-15, 15]}
      failOffsetY={[-10, 10]}
      enabled={!!post}
    >
      <Animated.View
        style={[
          styles.container,
          { paddingTop: insets.top, opacity, transform: [{ translateX }, { scale }] },
        ]}
      >
        {/* Article banner ad — above header, fixed height so content doesn't shift when ad loads */}
        <View style={{ marginHorizontal: 0, minHeight: 60, backgroundColor: colors.surfaceAlt }}>
          <Animated.View style={{ opacity: adOpacity }}>
            <BannerAd
              key={post?.id}
              unitId={__DEV__ ? TestIds.ADAPTIVE_BANNER : "ca-app-pub-2618352557321545/6335999163"}
              size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
              requestOptions={{ requestNonPersonalizedAdsOnly: false }}
              onAdLoaded={() => Animated.timing(adOpacity, { toValue: 1, duration: 1000, useNativeDriver: true }).start()}
            />
          </Animated.View>
        </View>

        {/* Header bar */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Text style={styles.closeLabel}>✕</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <TouchableOpacity onPress={() => {
              const turningOn = !autoRead;
              triggerAutoReadToast(turningOn ? t("autoReadOn", lang) : t("autoReadOff", lang));
              onToggleAutoRead();
            }} style={[styles.autoReadBtn, autoRead && styles.autoReadBtnActive]}>
              <Text style={styles.autoReadEmoji}>{autoRead ? "🔊" : "🔇"}</Text>
            </TouchableOpacity>
            {Platform.OS === "ios" && (
              <TouchableOpacity onPress={() => setVoiceHelpVisible(true)} style={styles.voiceHelpBtn}>
                <Text style={styles.voiceHelpLabel}>?</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={cycleFontSize}
              style={[styles.fontSizeBtn, fontSizeIdx > 0 && styles.fontSizeBtnActive]}
            >
              <Text style={[styles.fontSizeBtnLabel, fontSizeIdx > 0 && { color: colors.brand }]}>
                {fontSizeIdx === 0 ? "A" : fontSizeIdx === 1 ? "A+" : "A++"}
              </Text>
            </TouchableOpacity>
          </View>
          {post && (
            <View ref={reactionBtnRef} collapsable={false}>
              <TouchableOpacity onPress={showPicker} style={styles.likeBtn}>
                <View style={styles.likeBtn}>
                  {reactionEntries.length > 0
                    ? reactionEntries.map(([emoji, count]) => (
                        <React.Fragment key={emoji}>
                          <Text style={styles.likeEmoji}>{emoji}</Text>
                          <Text style={styles.likeCount}>{count}</Text>
                        </React.Fragment>
                      ))
                    : <Text style={[styles.likeEmoji, { opacity: 0.35 }]}>😮</Text>
                  }
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={{ flex: 1, paddingBottom: keyboardHeight }}>
        <TapGestureHandler
          ref={doubleTapRef}
          numberOfTaps={2}
          onHandlerStateChange={onDoubleTap}
        >
        <View style={{ flex: 1 }}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            scrollsToTop={!!post}
          >
            {post && (
              <>
                {/* Date + Source */}
                <Text style={[styles.dateText, { marginBottom: 12 }]}>
                  {new Date(post.createdAt).toLocaleString(
                    lang === "zh-TW" ? "zh-TW" : lang === "zh-CN" ? "zh-CN" : "en-US",
                    { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }
                  )}
                  {!!getSourceName(post.sourceUrl) && (
                    <Text style={styles.sourceLabel}>{"  |  "}{getSourceName(post.sourceUrl)}</Text>
                  )}
                </Text>

                {/* Title */}
                <Text style={styles.title}>{displayTitle}</Text>

                {/* Hero image */}
                {!!(ogImage ?? post.imageUrl) && (
                  <HeroImage
                    lowRes={post.imageUrl ?? undefined}
                    highRes={ogImage ?? undefined}
                    width={contentWidth}
                  />
                )}

                {/* Body */}
                {renderHtmlAsText(displayBody, colors.textSub, colors.text, FONT_SIZES[fontSizeIdx].body, FONT_SIZES[fontSizeIdx].line)}

                {/* Fun fact */}
                {!!post.funFact && (
                  <View style={styles.funFact}>
                    {renderHtmlAsText(displayFunFact, "#92400e", "#92400e", 13, 20)}
                  </View>
                )}

                {/* Tags */}
                {post.tags?.length > 0 && (
                  <View style={[styles.tags, { marginTop: 16 }]}>
                    {post.tags.map((tag) => (
                      <View key={tag} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Source link + share buttons */}
                {!!post.sourceUrl && (
                  <View style={styles.sourceRow}>
                    <TouchableOpacity
                      onPress={() => Linking.openURL(post.sourceUrl!.trim())}
                      style={styles.sourceBtn}
                    >
                      <Text style={styles.sourceBtnLabel}>{t("viewSource", lang)}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.shareBtn}
                      onPress={() => {
                        const appLink = `https://sparknotes-production.up.railway.app/posts/${post.id}`;
                        Linking.openURL(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(appLink)}`);
                      }}
                    >
                      <Text style={[styles.shareBtnText, { color: "#1877f2" }]}>f</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.shareBtn}
                      onPress={() => {
                        const appLink = `https://sparknotes-production.up.railway.app/posts/${post.id}`;
                        Linking.openURL(`https://twitter.com/intent/tweet?url=${encodeURIComponent(appLink)}&text=${encodeURIComponent(post.title)}`);
                      }}
                    >
                      <Text style={[styles.shareBtnText, { color: "#000000" }]}>𝕏</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.shareBtn}
                      onPress={() => {
                        const appLink = `https://sparknotes-production.up.railway.app/posts/${post.id}`;
                        Linking.openURL(`sms:&body=${encodeURIComponent(appLink)}`);
                      }}
                    >
                      <Text style={[styles.shareBtnText, { color: "#34c759" }]}>💬</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.shareBtn}
                      onPress={() => {
                        const appLink = `https://sparknotes-production.up.railway.app/posts/${post.id}`;
                        Linking.openURL(`fb-messenger://share?link=${encodeURIComponent(appLink)}`);
                      }}
                    >
                      <Text style={[styles.shareBtnText, { color: "#0084ff" }]}>m</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.shareBtn}
                      onPress={() => {
                        const appLink = `https://sparknotes-production.up.railway.app/posts/${post.id}`;
                        Share.share(
                          Platform.OS === "ios"
                            ? { url: appLink }
                            : { message: appLink }
                        );
                      }}
                    >
                      <Text style={styles.shareBtnText}>🔗</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Comments */}
                <Text style={styles.commentsHeader}>
                  {lang === "en"
                    ? `${comments.length} Comment${comments.length === 1 ? "" : "s"}`
                    : `${comments.length} ${t("comments", lang)}`}
                </Text>

                {commentsLoading && (
                  <ActivityIndicator color={colors.brand} style={{ marginVertical: 16 }} />
                )}

                {comments.map((c) => (
                  <View key={c.id} style={styles.comment}>
                    <Text style={styles.commentName}>{c.screenName}</Text>
                    <Text style={styles.commentBody}>{c.text}</Text>
                  </View>
                ))}

                <View style={{ height: 80 }} />
              </>
            )}
          </ScrollView>
        </View>
        </TapGestureHandler>
        <View style={[styles.inputRow, { paddingBottom: Math.max(12, insets.bottom) }]}>
          <TextInput
            ref={commentInputRef}
            style={styles.input}
            placeholder={isAuthenticated ? t("addComment", lang) : t("signInToComment", lang)}
            placeholderTextColor={colors.textMuted}
            value={commentText}
            onChangeText={setCommentText}
            onFocus={() => { if (!isAuthenticated) onSignInRequired(); }}
            editable={isAuthenticated && !!post}
            multiline
            maxLength={500}
            onTouchEnd={Platform.OS === "android" ? () => requestAnimationFrame(() => commentInputRef.current?.focus()) : undefined}
          />
          <TouchableOpacity
            onPress={handleComment}
            disabled={!commentText.trim() || submitting}
            style={[styles.sendBtn, (!commentText.trim() || submitting) && styles.sendBtnDisabled]}
          >
            <Text style={styles.sendLabel}>↑</Text>
          </TouchableOpacity>
        </View>

        </View>

        {/* Double-tap heart animation */}
        <Animated.View
          style={[styles.heartOverlay, { opacity: heartOpacity, transform: [{ scale: heartScale }] }]}
          pointerEvents="none"
        >
          <Text>❤️</Text>
        </Animated.View>

        {/* Voice help modal */}
        <Modal visible={voiceHelpVisible} transparent animationType="fade" onRequestClose={() => setVoiceHelpVisible(false)}>
          <View style={styles.voiceHelpOverlay}>
            <View style={styles.voiceHelpCard}>
              <Text style={styles.voiceHelpTitle}>{t("voiceHelpTitle", lang)}</Text>
              <Text style={styles.voiceHelpBody}>{t("voiceHelpBody", lang)}</Text>
              <Text style={styles.voiceHelpStep}>{t("voiceHelpStep1Pre", lang)}<Text style={{ fontWeight: "700" }}>{t("voiceHelpStep1Settings", lang)}</Text></Text>
              <Text style={styles.voiceHelpStep}>{t("voiceHelpStep2Pre", lang)}<Text style={{ fontWeight: "700" }}>{parseInt(Platform.Version as string) >= 18 ? t("voiceHelpStep2New", lang) : t("voiceHelpStep2Old", lang)}</Text></Text>
              {lang === "en" ? (<>
                <Text style={styles.voiceHelpStep}>{t("voiceHelpEnStep3Pre", lang)}<Text style={{ fontWeight: "700" }}>{t("voiceHelpEnStep3Lang", lang)}</Text>{t("voiceHelpEnStep3Then", lang)}<Text style={{ fontWeight: "700" }}>{t("voiceHelpEnStep3Region", lang)}</Text></Text>
                <Text style={styles.voiceHelpStep}>{t("voiceHelpEnStep4Pre", lang)}<Text style={{ fontWeight: "700" }}>{t("voiceHelpEnStep4Download", lang)}</Text>{t("voiceHelpEnStep4Suf", lang)}</Text>
              </>) : (<>
                <Text style={styles.voiceHelpStep}>{t("voiceHelpZhStep3Pre", lang)}<Text style={{ fontWeight: "700" }}>{t("voiceHelpZhStep3Lang", lang)}</Text>{t("voiceHelpZhStep3Then", lang)}<Text style={{ fontWeight: "700" }}>{t("voiceHelpZhStep3Region", lang)}</Text></Text>
                <Text style={styles.voiceHelpStep}>{t("voiceHelpZhStep4Pre", lang)}<Text style={{ fontWeight: "700" }}>{t("voiceHelpZhStep4Voice", lang)}</Text>{t("voiceHelpZhStep4Suf", lang)}</Text>
              </>)}
              <Text style={[styles.voiceHelpStep, { marginTop: 12, color: colors.textMuted, fontSize: 13 }]}>{t("voiceHelpFooter", lang)}</Text>
              <TouchableOpacity style={styles.voiceHelpClose} onPress={() => setVoiceHelpVisible(false)}>
                <Text style={styles.voiceHelpCloseLabel}>{t("voiceHelpGotIt", lang)}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Auto-read toast */}
        <Animated.View style={[styles.autoReadToast, { opacity: autoReadToastOpacity }]} pointerEvents="none">
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#ffffff" }}>{autoReadToastMsg}</Text>
        </Animated.View>
      </Animated.View>

    </PanGestureHandler>

    {/* Emoji reaction picker — outside PanGestureHandler so it's a single child */}
    <Modal visible={pickerVisible} transparent animationType="none" onRequestClose={hidePicker}>
      <Pressable style={StyleSheet.absoluteFillObject} onPress={hidePicker}>
        <Animated.View
          style={[
            styles.pickerRow,
            { position: "absolute", left: pickerPos.x, top: pickerPos.y, opacity: pickerAnim, transform: [{ scale: pickerAnim }] },
          ]}
        >
          {REACTIONS.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              onPress={() => handleReactSelect(emoji)}
              style={[styles.pickerEmoji, reaction === emoji && styles.pickerEmojiActive]}
            >
              <Text style={styles.pickerEmojiText}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      </Pressable>
    </Modal>
    </View>
  );
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    container: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: c.surface,
      zIndex: 100,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    closeLabel: { color: c.textSub, fontSize: 14 },
    autoReadBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    autoReadBtnActive: { backgroundColor: c.brand + "33" },
    autoReadEmoji: { fontSize: 18 },
    voiceHelpBtn: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: c.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    voiceHelpLabel: { fontSize: 11, fontWeight: "700", color: c.textMuted },
    fontSizeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    fontSizeBtnActive: { backgroundColor: c.brand + "33" },
    fontSizeBtnLabel: { fontSize: 13, fontWeight: "700", color: c.textMuted },
    voiceHelpOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
      padding: 32,
    },
    voiceHelpCard: {
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: 24,
      width: "100%",
    },
    voiceHelpTitle: { fontSize: 16, fontWeight: "800", color: c.text, marginBottom: 12 },
    voiceHelpBody: { fontSize: 14, color: c.textSub, lineHeight: 22, marginBottom: 20 },
    voiceHelpStep: { fontSize: 14, color: c.textSub, lineHeight: 22 },
    voiceHelpClose: {
      alignSelf: "center",
      paddingHorizontal: 24,
      paddingVertical: 10,
      backgroundColor: c.brand,
      borderRadius: 20,
      marginTop: 4,
    },
    voiceHelpCloseLabel: { color: "#fff", fontWeight: "700", fontSize: 14 },
    likeBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
    likeEmoji: { fontSize: 22 },
    likeCount: { color: c.textSub, fontSize: 14, fontWeight: "600" },
    scroll: { flex: 1 },
    scrollContent: { padding: 16 },
    dateText: { fontSize: 11, color: c.textMuted },
    sourceLabel: { fontSize: 11, color: c.textMuted },
    title: {
      fontSize: 22,
      fontWeight: "800",
      color: c.text,
      lineHeight: 28,
      marginBottom: 16,
    },
    funFact: {
      backgroundColor: "#fffbeb",
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
      borderLeftWidth: 3,
      borderLeftColor: "#f59e0b",
    },
    tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 24 },
    tag: {
      backgroundColor: c.surfaceAlt,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    tagText: { color: c.textTertiary, fontSize: 12 },
    sourceRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 24,
    },
    sourceBtn: {
      borderWidth: 1.5,
      borderColor: c.brand,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 7,
    },
    sourceBtnLabel: { color: c.brand, fontSize: 13, fontWeight: "700" },
    shareBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: c.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    shareBtnText: {
      fontSize: 15,
      fontWeight: "700",
      color: c.textTertiary,
    },
    commentsHeader: { fontSize: 16, fontWeight: "700", color: c.text, marginBottom: 16 },
    comment: {
      marginBottom: 16,
      paddingBottom: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    commentName: { fontSize: 13, fontWeight: "700", color: c.brand, marginBottom: 4 },
    commentBody: { fontSize: 14, color: c.textSub, lineHeight: 20 },
    inputRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      backgroundColor: c.surface,
      gap: 8,
    },
    input: {
      flex: 1,
      backgroundColor: c.surfaceAlt,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 10,
      color: c.text,
      fontSize: 14,
      maxHeight: 100,
    },
    sendBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.brand,
      alignItems: "center",
      justifyContent: "center",
    },
    sendBtnDisabled: { opacity: 0.4 },
    sendLabel: { color: "#ffffff", fontSize: 16, fontWeight: "700" },
    heartOverlay: {
      position: "absolute",
      alignSelf: "center",
      top: "40%",
      fontSize: 80,
      zIndex: 200,
    },
    pickerRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surface,
      borderRadius: 32,
      paddingHorizontal: 8,
      paddingVertical: 6,
      gap: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 8,
    },
    pickerEmoji: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
    },
    pickerEmojiActive: {
      backgroundColor: c.surfaceAlt,
      transform: [{ scale: 1.2 }],
    },
    pickerEmojiText: {
      fontSize: 26,
    },
    autoReadToast: {
      position: "absolute",
      alignSelf: "center",
      top: "45%",
      backgroundColor: "rgba(0,0,0,0.6)",
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      zIndex: 200,
    },
  });
}
