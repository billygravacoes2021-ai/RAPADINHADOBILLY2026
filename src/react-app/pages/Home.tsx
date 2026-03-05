import { useState, useRef, useEffect, useMemo } from "react";
import { Settings, Trash2, Plus, Upload, Moon, Sun, Users, Gift, MessageCircle, Eye, EyeOff, BarChart3 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/react-app/components/ui/dialog";
import { Input } from "@/react-app/components/ui/input";
import { Button } from "@/react-app/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/react-app/components/ui/tabs";
import { ScrollArea } from "@/react-app/components/ui/scroll-area";
import confetti from "canvas-confetti";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import {
  useSettings,
  usePrizes,
  useParticipants,
  uploadImage,
  verifyAdminPassword,
  checkPhoneExists,
  type Prize,
} from "@/react-app/hooks/useApi";

export default function HomePage() {
  const { settings, loading: settingsLoading, updateSetting } = useSettings();
  const { prizes, loading: prizesLoading, addPrize, deletePrize } = usePrizes();
  const { addParticipant, participants, deleteParticipant, deleteAllParticipants } = useParticipants();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [gameStarted, setGameStarted] = useState(false);
  const [cards, setCards] = useState<Array<{ prize: Prize; revealed: boolean }>>([]);
  const [winningCard, setWinningCard] = useState<number | null>(null);
  const [hasWon, setHasWon] = useState<boolean | null>(null);
  const [wonPrize, setWonPrize] = useState<Prize | null>(null);
  const [showResult, setShowResult] = useState(false);

  // Admin state
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [newPrizeName, setNewPrizeName] = useState("");
  const [newPrizeEmoji, setNewPrizeEmoji] = useState("🎁");
  const [newPrizeImage, setNewPrizeImage] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // Admin form state
  const [adminMarquee, setAdminMarquee] = useState("");
  const [adminChance, setAdminChance] = useState("");
  const [adminWhatsApp, setAdminWhatsApp] = useState("");
  const [adminMarqueeSpeed, setAdminMarqueeSpeed] = useState("15");
  const [adminBgEmojis, setAdminBgEmojis] = useState("💜,🌸,💐,🌷");
  const [adminAppName, setAdminAppName] = useState("Raspadinha");
  const [adminAppSubtitle, setAdminAppSubtitle] = useState("PREMIADA");
  const [adminAppEmoji, setAdminAppEmoji] = useState("✨");
  const [adminInstagram, setAdminInstagram] = useState("");
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  const isDark = settings?.theme === "dark";
  const marqueeSpeed = settings?.marquee_speed || "15";
  const bgEmojis = (settings?.bg_emojis || "💜,🌸,💐,🌷").split(",").map(e => e.trim());
  const appName = settings?.app_name || "Raspadinha";
  const appSubtitle = settings?.app_subtitle || "PREMIADA";
  const appEmoji = settings?.app_emoji || "✨";
  const instagramLink = settings?.instagram_link || "";

  useEffect(() => {
    if (settings) {
      setAdminMarquee(settings.marquee_text);
      setAdminChance(settings.win_chance);
      setAdminWhatsApp(settings.whatsapp_link);
      setAdminMarqueeSpeed(settings.marquee_speed || "15");
      setAdminBgEmojis(settings.bg_emojis || "💜,🌸,💐,🌷");
      setAdminAppName(settings.app_name || "Raspadinha");
      setAdminAppSubtitle(settings.app_subtitle || "PREMIADA");
      setAdminAppEmoji(settings.app_emoji || "✨");
      setAdminInstagram(settings.instagram_link || "");
    }
  }, [settings]);

  // Stats calculations
  const stats = useMemo(() => {
    const winners = participants.filter(p => p.is_winner === 1);
    const losers = participants.filter(p => p.is_winner === 0);
    
    const prizeCount: Record<string, number> = {};
    winners.forEach(p => {
      if (p.prize_won) {
        prizeCount[p.prize_won] = (prizeCount[p.prize_won] || 0) + 1;
      }
    });
    
    const pieData = [
      { name: "Ganhadores", value: winners.length, color: "#22c55e" },
      { name: "Não ganharam", value: losers.length, color: "#ef4444" },
    ];
    
    const barData = Object.entries(prizeCount).map(([name, value]) => ({
      name: name.length > 12 ? name.slice(0, 12) + "..." : name,
      quantidade: value,
    }));
    
    return {
      total: participants.length,
      winners: winners.length,
      losers: losers.length,
      winRate: participants.length > 0 ? ((winners.length / participants.length) * 100).toFixed(1) : "0",
      pieData,
      barData,
    };
  }, [participants]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  const startGame = async () => {
    if (!name.trim() || !phone.trim()) {
      alert("Por favor, preencha seu nome e WhatsApp!");
      return;
    }

    if (prizes.length === 0) {
      alert("Nenhum prêmio cadastrado!");
      return;
    }

    // Check if phone number already played
    const phoneExists = await checkPhoneExists(phone);
    if (phoneExists) {
      alert("Este número já participou! Cada pessoa só pode jogar uma vez.");
      return;
    }

    const newCards = Array.from({ length: 9 }, () => ({
      prize: prizes[Math.floor(Math.random() * prizes.length)],
      revealed: false,
    }));

    const winChance = parseFloat(settings?.win_chance || "35");
    const wins = Math.random() * 100 < winChance;
    setHasWon(wins);

    if (wins) {
      const winIdx = Math.floor(Math.random() * 9);
      setWinningCard(winIdx);
      setWonPrize(newCards[winIdx].prize);
    } else {
      setWinningCard(null);
      setWonPrize(null);
    }

    setCards(newCards);
    setGameStarted(true);
    setShowResult(false);
  };

  const handleReveal = (index: number) => {
    const newCards = [...cards];
    newCards[index].revealed = true;
    setCards(newCards);

    const allRevealed = newCards.every((c) => c.revealed);
    if (allRevealed) {
      setTimeout(async () => {
        if (hasWon && wonPrize) {
          // Fire confetti
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ["#ff5fa2", "#ffd1e6", "#22c55e", "#fbbf24"],
          });
          await addParticipant(name, phone, wonPrize.name, true);
        } else {
          await addParticipant(name, phone, undefined, false);
        }
        setShowResult(true);
      }, 500);
    }
  };

  const handleAdminLogin = async () => {
    const success = await verifyAdminPassword(adminPassword);
    if (success) {
      setIsAdminLoggedIn(true);
    } else {
      alert("Senha incorreta!");
    }
  };

  const handleAddPrize = async () => {
    if (!newPrizeName.trim()) return;
    setSaving(true);
    let imageUrl: string | undefined;
    if (newPrizeImage) {
      imageUrl = await uploadImage(newPrizeImage);
    }
    await addPrize(newPrizeName, newPrizeEmoji, imageUrl);
    setNewPrizeName("");
    setNewPrizeEmoji("🎁");
    setNewPrizeImage(null);
    setSaving(false);
  };

  const saveSettings = async () => {
    setSaving(true);
    await updateSetting("marquee_text", adminMarquee);
    await updateSetting("win_chance", adminChance);
    await updateSetting("whatsapp_link", adminWhatsApp);
    await updateSetting("marquee_speed", adminMarqueeSpeed);
    await updateSetting("bg_emojis", adminBgEmojis);
    await updateSetting("app_name", adminAppName);
    await updateSetting("app_subtitle", adminAppSubtitle);
    await updateSetting("app_emoji", adminAppEmoji);
    await updateSetting("instagram_link", adminInstagram);
    setSaving(false);
    alert("Configurações salvas!");
  };

  const toggleTheme = async () => {
    const newTheme = isDark ? "pink" : "dark";
    await updateSetting("theme", newTheme);
  };

  const resetGame = () => {
    setGameStarted(false);
    setCards([]);
    setHasWon(null);
    setWinningCard(null);
    setWonPrize(null);
    setShowResult(false);
    setName("");
    setPhone("");
  };

  const handleWhatsAppClick = (isWinner: boolean) => {
    const link = settings?.whatsapp_link || "";
    if (link) {
      const msg = isWinner 
        ? encodeURIComponent(`Olá! Sou ${name} e ganhei: ${wonPrize?.name}! 🎉`)
        : encodeURIComponent(`Olá! Participei da raspadinha e gostaria de tentar outra chance!`);
      const url = link.includes("wa.me") ? `${link}?text=${msg}` : `https://wa.me/${link.replace(/\D/g, "")}?text=${msg}`;
      window.open(url, "_blank");
    }
  };

  const handleSupportWhatsApp = () => {
    const link = settings?.whatsapp_link || "";
    if (link) {
      const msg = encodeURIComponent(`Olá! Preciso de ajuda com a raspadinha.`);
      const url = link.includes("wa.me") ? `${link}?text=${msg}` : `https://wa.me/${link.replace(/\D/g, "")}?text=${msg}`;
      window.open(url, "_blank");
    }
  };

  if (settingsLoading || prizesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-500 via-pink-400 to-rose-400 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-white text-xl animate-pulse">Carregando...</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      isDark 
        ? "bg-gradient-to-br from-gray-900 via-gray-800 to-black" 
        : "bg-gradient-to-br from-pink-500 via-rose-400 to-pink-300"
    }`}>
      {/* Animated background elements - Dia das Mulheres */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl opacity-30 ${isDark ? "bg-purple-600" : "bg-white"}`} />
        <div className={`absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-3xl opacity-20 ${isDark ? "bg-pink-600" : "bg-yellow-200"}`} />
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl opacity-10 ${isDark ? "bg-blue-500" : "bg-white"}`} />
        
        {/* Floating Emojis - Customizable */}
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-float-womens-day"
            style={{
              left: `${5 + (i * 8)}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${6 + (i % 3) * 2}s`,
              fontSize: `${1.5 + (i % 3) * 0.5}rem`,
              opacity: isDark ? 0.4 : 0.6,
            }}
          >
            {bgEmojis[i % bgEmojis.length]}
          </div>
        ))}
        
        {/* Sparkle effects */}
        {[...Array(8)].map((_, i) => (
          <div
            key={`sparkle-${i}`}
            className="absolute animate-sparkle-womens"
            style={{
              left: `${10 + (i * 12)}%`,
              top: `${20 + (i % 4) * 20}%`,
              animationDelay: `${i * 0.7}s`,
              fontSize: "1.2rem",
              opacity: isDark ? 0.5 : 0.7,
            }}
          >
            ✨
          </div>
        ))}
      </div>

      {/* Marquee Banner */}
      <div className={`fixed top-0 left-0 right-0 z-50 overflow-hidden backdrop-blur-md ${
        isDark ? "bg-gray-900/80 border-b border-gray-700" : "bg-white/90 shadow-lg"
      }`}>
        <div className="flex whitespace-nowrap py-3">
          <span 
            className={`animate-marquee font-bold text-lg inline-block ${isDark ? "text-pink-400" : "text-pink-500"}`}
            style={{ animationDuration: `${marqueeSpeed}s` }}
          >
            {settings?.marquee_text}&nbsp;&nbsp;&nbsp;✨&nbsp;&nbsp;&nbsp;{settings?.marquee_text}&nbsp;&nbsp;&nbsp;✨&nbsp;&nbsp;&nbsp;{settings?.marquee_text}&nbsp;&nbsp;&nbsp;
          </span>
        </div>
      </div>

      {/* Admin Gear */}
      <button
        onClick={() => setAdminOpen(true)}
        className={`fixed top-14 right-4 p-3 rounded-full transition-all z-50 ${
          isDark 
            ? "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700" 
            : "bg-white/20 text-white/50 hover:text-white hover:bg-white/30"
        }`}
      >
        <Settings className="w-5 h-5" />
      </button>

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className={`fixed top-14 right-16 p-3 rounded-full transition-all z-50 ${
          isDark 
            ? "bg-gray-800 text-yellow-400 hover:bg-gray-700" 
            : "bg-white/20 text-white hover:bg-white/30"
        }`}
      >
        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      {/* WhatsApp Support Button */}
      {settings?.whatsapp_link && (
        <button
          onClick={handleSupportWhatsApp}
          className="fixed bottom-4 left-4 flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold shadow-lg shadow-green-500/30 hover:from-green-600 hover:to-green-700 transition-all z-50 hover:scale-105"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm">Suporte</span>
        </button>
      )}

      {/* Instagram Button */}
      {instagramLink && (
        <a
          href={instagramLink.startsWith("http") ? instagramLink : `https://instagram.com/${instagramLink.replace("@", "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-4 left-36 flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white font-semibold shadow-lg shadow-pink-500/30 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 transition-all z-50 hover:scale-105"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
          <span className="text-sm">Instagram</span>
        </a>
      )}

      {/* Main Content */}
      <div className="relative min-h-screen flex items-center justify-center pt-20 pb-8 px-4">
        <div className="w-full max-w-lg">
          {!gameStarted ? (
            <div className="text-center space-y-6">
              <div className="mb-8">
                <div className="text-5xl mb-4">{appEmoji}</div>
                <h1 className={`text-5xl font-black tracking-tight mb-3 ${isDark ? "text-white" : "text-white drop-shadow-lg"}`}>
                  {appName}
                </h1>
                <p className={`text-2xl font-bold ${isDark ? "text-pink-400" : "text-white/90"}`}>
                  {appSubtitle} {appEmoji}
                </p>
              </div>

              <div className={`p-6 rounded-3xl space-y-4 ${
                isDark ? "bg-gray-800/50 backdrop-blur-xl border border-gray-700" : "bg-white/20 backdrop-blur-xl"
              }`}>
                <Input
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`h-14 text-lg rounded-2xl border-0 ${
                    isDark 
                      ? "bg-gray-700 text-white placeholder:text-gray-400" 
                      : "bg-white/90 text-gray-800 placeholder:text-gray-500"
                  }`}
                />
                <Input
                  placeholder="WhatsApp com DDD"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`h-14 text-lg rounded-2xl border-0 ${
                    isDark 
                      ? "bg-gray-700 text-white placeholder:text-gray-400" 
                      : "bg-white/90 text-gray-800 placeholder:text-gray-500"
                  }`}
                />
                <Button
                  onClick={startGame}
                  className="w-full h-14 text-lg font-bold rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-xl shadow-green-500/25 transition-all hover:scale-[1.02]"
                >
                  COMEÇAR 🎰
                </Button>
              </div>
            </div>
          ) : showResult ? (
            <div className="text-center">
              <div className={`p-8 rounded-3xl ${
                isDark ? "bg-gray-800/80 backdrop-blur-xl border border-gray-700" : "bg-white/95 backdrop-blur-xl shadow-2xl"
              }`}>
                {hasWon ? (
                  <>
                    <div className="text-6xl mb-4">🎉</div>
                    <h2 className={`text-3xl font-black mb-2 ${isDark ? "text-green-400" : "text-green-500"}`}>
                      PARABÉNS!
                    </h2>
                    <p className={`text-xl mb-2 ${isDark ? "text-white" : "text-gray-800"}`}>
                      Você ganhou:
                    </p>
                    <div className={`text-2xl font-bold mb-6 ${isDark ? "text-pink-400" : "text-pink-500"}`}>
                      {wonPrize?.emoji} {wonPrize?.name}
                    </div>
                    {settings?.whatsapp_link && (
                      <Button
                        onClick={() => handleWhatsAppClick(true)}
                        className="w-full h-14 text-lg font-bold rounded-2xl bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-xl mb-4"
                      >
                        📱 Receba pelo WhatsApp
                      </Button>
                    )}
                    <Button
                      onClick={resetGame}
                      variant="outline"
                      className={`w-full h-12 rounded-xl ${isDark ? "border-gray-600 text-gray-300" : ""}`}
                    >
                      Jogar Novamente
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="text-6xl mb-4">😢</div>
                    <h2 className={`text-2xl font-bold mb-2 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                      Você perdeu!
                    </h2>
                    <p className={`mb-6 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                      Entre em contato conosco para tentar outra chance.
                    </p>
                    {settings?.whatsapp_link && (
                      <Button
                        onClick={() => handleWhatsAppClick(false)}
                        className="w-full h-14 text-lg font-bold rounded-2xl bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-xl mb-4"
                      >
                        📱 Falar no WhatsApp
                      </Button>
                    )}
                    <Button
                      onClick={resetGame}
                      variant="outline"
                      className={`w-full h-12 rounded-xl ${isDark ? "border-gray-600 text-gray-300" : ""}`}
                    >
                      Tentar Novamente
                    </Button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className={`p-5 rounded-3xl ${
                isDark ? "bg-gray-800/80 backdrop-blur-xl border border-gray-700" : "bg-white/95 backdrop-blur-xl shadow-2xl"
              }`}>
                <p className={`text-center font-semibold mb-4 ${isDark ? "text-pink-400" : "text-pink-500"}`}>
                  ✨ Raspe os cartões para descobrir seu prêmio!
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {cards.map((card, index) => (
                    <ScratchCard
                      key={index}
                      prize={card.prize}
                      isWinning={winningCard === index}
                      isDark={isDark}
                      onReveal={() => handleReveal(index)}
                      index={index}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Admin Dialog */}
      <Dialog open={adminOpen} onOpenChange={setAdminOpen}>
        <DialogContent className={`max-w-md max-h-[90vh] ${isDark ? "bg-gray-900 border-gray-700" : ""}`}>
          <DialogHeader>
            <DialogTitle className={`text-center ${isDark ? "text-pink-400" : "text-pink-500"}`}>
              🔐 Painel Admin
            </DialogTitle>
          </DialogHeader>

          {!isAdminLoggedIn ? (
            <div className="space-y-4">
              <div className="relative">
                <Input
                  type={showAdminPassword ? "text" : "password"}
                  placeholder="Senha"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
                  className={`pr-10 ${isDark ? "bg-gray-800 border-gray-700 text-white" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPassword(!showAdminPassword)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-700"}`}
                >
                  {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Button 
                onClick={handleAdminLogin} 
                className="w-full bg-pink-500 hover:bg-pink-600"
              >
                Entrar
              </Button>
            </div>
          ) : (
            <Tabs defaultValue="stats" className="w-full">
              <TabsList className={`grid w-full grid-cols-4 ${isDark ? "bg-gray-800" : ""}`}>
                <TabsTrigger value="stats" className="text-xs">
                  <BarChart3 className="w-4 h-4 mr-1" /> Stats
                </TabsTrigger>
                <TabsTrigger value="prizes" className="text-xs">
                  <Gift className="w-4 h-4 mr-1" /> Prêmios
                </TabsTrigger>
                <TabsTrigger value="participants" className="text-xs">
                  <Users className="w-4 h-4 mr-1" /> Pessoas
                </TabsTrigger>
                <TabsTrigger value="settings" className="text-xs">
                  <Settings className="w-4 h-4 mr-1" /> Config
                </TabsTrigger>
              </TabsList>

              {/* Stats Tab */}
              <TabsContent value="stats" className="space-y-4 mt-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-2">
                  <div className={`p-3 rounded-xl text-center ${isDark ? "bg-gray-800" : "bg-gradient-to-br from-blue-50 to-blue-100"}`}>
                    <div className={`text-2xl font-bold ${isDark ? "text-blue-400" : "text-blue-600"}`}>{stats.total}</div>
                    <div className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>Total</div>
                  </div>
                  <div className={`p-3 rounded-xl text-center ${isDark ? "bg-gray-800" : "bg-gradient-to-br from-green-50 to-green-100"}`}>
                    <div className={`text-2xl font-bold ${isDark ? "text-green-400" : "text-green-600"}`}>{stats.winners}</div>
                    <div className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>Ganhadores</div>
                  </div>
                  <div className={`p-3 rounded-xl text-center ${isDark ? "bg-gray-800" : "bg-gradient-to-br from-pink-50 to-pink-100"}`}>
                    <div className={`text-2xl font-bold ${isDark ? "text-pink-400" : "text-pink-600"}`}>{stats.winRate}%</div>
                    <div className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>Taxa</div>
                  </div>
                </div>

                {/* Pie Chart */}
                <div className={`p-4 rounded-xl ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                  <h3 className={`text-sm font-semibold mb-2 ${isDark ? "text-white" : "text-gray-700"}`}>Resultados</h3>
                  {stats.total > 0 ? (
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie
                          data={stats.pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={60}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                          labelLine={false}
                        >
                          {stats.pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className={`text-center py-8 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                      Nenhum participante ainda
                    </div>
                  )}
                </div>

                {/* Bar Chart */}
                {stats.barData.length > 0 && (
                  <div className={`p-4 rounded-xl ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                    <h3 className={`text-sm font-semibold mb-2 ${isDark ? "text-white" : "text-gray-700"}`}>Prêmios Ganhos</h3>
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart data={stats.barData} layout="vertical">
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10, fill: isDark ? "#9ca3af" : "#6b7280" }} />
                        <Tooltip />
                        <Bar dataKey="quantidade" fill="#ec4899" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="prizes" className="space-y-4 mt-4">
                <div className={`p-4 rounded-xl space-y-3 ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                  <Input
                    placeholder="Nome do prêmio"
                    value={newPrizeName}
                    onChange={(e) => setNewPrizeName(e.target.value)}
                    className={isDark ? "bg-gray-700 border-gray-600 text-white" : ""}
                  />
                  <div className="flex gap-2">
                    <Input
                      placeholder="Emoji"
                      value={newPrizeEmoji}
                      onChange={(e) => setNewPrizeEmoji(e.target.value)}
                      className={`w-20 ${isDark ? "bg-gray-700 border-gray-600 text-white" : ""}`}
                    />
                    <label className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg cursor-pointer ${
                      isDark ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-200 hover:bg-gray-300"
                    }`}>
                      <Upload className="w-4 h-4" />
                      <span className="text-sm">{newPrizeImage ? newPrizeImage.name.slice(0, 10) + "..." : "Imagem"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => setNewPrizeImage(e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>
                  <Button
                    onClick={handleAddPrize}
                    disabled={saving || !newPrizeName.trim()}
                    className="w-full bg-green-500 hover:bg-green-600"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Adicionar Prêmio
                  </Button>
                </div>

                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {prizes.map((prize) => (
                      <div
                        key={prize.id}
                        className={`flex items-center gap-3 p-3 rounded-xl ${
                          isDark ? "bg-gray-800" : "bg-gray-50"
                        }`}
                      >
                        {prize.image_url ? (
                          <img src={prize.image_url} alt={prize.name} className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <span className="text-2xl">{prize.emoji}</span>
                        )}
                        <span className={`flex-1 font-medium ${isDark ? "text-white" : ""}`}>{prize.name}</span>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deletePrize(prize.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="participants" className="space-y-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className={`font-medium ${isDark ? "text-gray-300" : ""}`}>
                    Total: {participants.length}
                  </span>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (confirm("Apagar TODOS os participantes?")) {
                        deleteAllParticipants();
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-1" /> Limpar Todos
                  </Button>
                </div>

                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {participants.map((p) => (
                      <div
                        key={p.id}
                        className={`p-3 rounded-xl ${isDark ? "bg-gray-800" : "bg-gray-50"}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`font-medium ${isDark ? "text-white" : ""}`}>{p.name}</p>
                            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>{p.phone}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {p.is_winner ? (
                              <span className="text-green-500 text-xs font-medium">🏆 {p.prize_won}</span>
                            ) : (
                              <span className="text-gray-400 text-xs">Não ganhou</span>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteParticipant(p.id)}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4 mt-4">
                <div>
                  <label className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    Texto da barra
                  </label>
                  <Input
                    value={adminMarquee}
                    onChange={(e) => setAdminMarquee(e.target.value)}
                    className={`mt-1 ${isDark ? "bg-gray-800 border-gray-700 text-white" : ""}`}
                  />
                </div>
                <div>
                  <label className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    Chance de ganhar (%)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={adminChance}
                    onChange={(e) => setAdminChance(e.target.value)}
                    className={`mt-1 ${isDark ? "bg-gray-800 border-gray-700 text-white" : ""}`}
                  />
                </div>
                <div>
                  <label className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    Link do WhatsApp
                  </label>
                  <Input
                    placeholder="5511999999999 ou https://wa.me/..."
                    value={adminWhatsApp}
                    onChange={(e) => setAdminWhatsApp(e.target.value)}
                    className={`mt-1 ${isDark ? "bg-gray-800 border-gray-700 text-white" : ""}`}
                  />
                </div>
                <div>
                  <label className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    Velocidade do marquee (segundos)
                  </label>
                  <Input
                    type="number"
                    min={5}
                    max={60}
                    value={adminMarqueeSpeed}
                    onChange={(e) => setAdminMarqueeSpeed(e.target.value)}
                    className={`mt-1 ${isDark ? "bg-gray-800 border-gray-700 text-white" : ""}`}
                  />
                  <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                    Menor = mais rápido
                  </p>
                </div>
                <div>
                  <label className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    Emojis do fundo (separados por vírgula)
                  </label>
                  <Input
                    placeholder="💜,🌸,💐,🌷"
                    value={adminBgEmojis}
                    onChange={(e) => setAdminBgEmojis(e.target.value)}
                    className={`mt-1 ${isDark ? "bg-gray-800 border-gray-700 text-white" : ""}`}
                  />
                  <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                    Ex: 🎉,⭐,🎁,💎
                  </p>
                </div>
                <div className={`border-t pt-4 mt-4 ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                  <h4 className={`font-semibold mb-3 ${isDark ? "text-white" : "text-gray-800"}`}>Personalização da Raspadinha</h4>
                  <div className="space-y-4">
                    <div>
                      <label className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                        Nome principal
                      </label>
                      <Input
                        placeholder="Raspadinha"
                        value={adminAppName}
                        onChange={(e) => setAdminAppName(e.target.value)}
                        className={`mt-1 ${isDark ? "bg-gray-800 border-gray-700 text-white" : ""}`}
                      />
                    </div>
                    <div>
                      <label className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                        Subtítulo
                      </label>
                      <Input
                        placeholder="PREMIADA"
                        value={adminAppSubtitle}
                        onChange={(e) => setAdminAppSubtitle(e.target.value)}
                        className={`mt-1 ${isDark ? "bg-gray-800 border-gray-700 text-white" : ""}`}
                      />
                    </div>
                    <div>
                      <label className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                        Emoji/Ícone de destaque
                      </label>
                      <Input
                        placeholder="✨"
                        value={adminAppEmoji}
                        onChange={(e) => setAdminAppEmoji(e.target.value)}
                        className={`mt-1 ${isDark ? "bg-gray-800 border-gray-700 text-white" : ""}`}
                      />
                      <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                        Ex: ✨ 🎁 💎 🌟
                      </p>
                    </div>
                  </div>
                </div>
                <div className={`border-t pt-4 mt-4 ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                  <h4 className={`font-semibold mb-3 ${isDark ? "text-white" : "text-gray-800"}`}>Redes Sociais</h4>
                  <div>
                    <label className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      Link do Instagram
                    </label>
                    <Input
                      placeholder="https://instagram.com/seu_perfil"
                      value={adminInstagram}
                      onChange={(e) => setAdminInstagram(e.target.value)}
                      className={`mt-1 ${isDark ? "bg-gray-800 border-gray-700 text-white" : ""}`}
                    />
                  </div>
                </div>
                <Button
                  onClick={saveSettings}
                  disabled={saving}
                  className="w-full bg-green-500 hover:bg-green-600 mt-4"
                >
                  {saving ? "Salvando..." : "Salvar Configurações"}
                </Button>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Scratch Card Component
function ScratchCard({
  prize,
  isWinning,
  isDark,
  onReveal,
  index,
}: {
  prize: Prize;
  isWinning: boolean;
  isDark: boolean;
  onReveal: () => void;
  index: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScratched, setIsScratched] = useState(false);
  const [sparkles, setSparkles] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const isDrawing = useRef(false);
  const scratchedPixels = useRef(0);
  const sparkleId = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);

    // Gradient background
    const gradient = ctx.createLinearGradient(0, 0, canvas.offsetWidth, canvas.offsetHeight);
    if (isDark) {
      gradient.addColorStop(0, "#7c3aed");
      gradient.addColorStop(0.5, "#a855f7");
      gradient.addColorStop(1, "#ec4899");
    } else {
      gradient.addColorStop(0, "#f472b6");
      gradient.addColorStop(0.5, "#ec4899");
      gradient.addColorStop(1, "#db2777");
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

    // Add sparkle pattern with animation-like effect
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    for (let i = 0; i < 12; i++) {
      const x = Math.random() * canvas.offsetWidth;
      const y = Math.random() * canvas.offsetHeight;
      const size = Math.random() * 3 + 1;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Add diagonal shine lines
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 8;
    for (let i = -50; i < canvas.offsetWidth + 50; i += 30) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + canvas.offsetHeight, canvas.offsetHeight);
      ctx.stroke();
    }

    ctx.fillStyle = "#fff";
    ctx.font = "bold 13px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.3)";
    ctx.shadowBlur = 4;
    ctx.fillText("✨ RASPE ✨", canvas.offsetWidth / 2, canvas.offsetHeight / 2);
  }, [isDark]);

  const addSparkle = (x: number, y: number) => {
    const id = sparkleId.current++;
    setSparkles((prev) => [...prev.slice(-5), { id, x, y }]);
    setTimeout(() => {
      setSparkles((prev) => prev.filter((s) => s.id !== id));
    }, 600);
  };

  const scratch = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.globalCompositeOperation = "destination-out";
    
    // Create a more interesting scratch pattern
    ctx.beginPath();
    ctx.arc(x * 2, y * 2, 28, 0, Math.PI * 2);
    ctx.fill();
    
    // Add some smaller scratches around
    for (let i = 0; i < 3; i++) {
      const offsetX = (Math.random() - 0.5) * 20;
      const offsetY = (Math.random() - 0.5) * 20;
      ctx.beginPath();
      ctx.arc(x * 2 + offsetX, y * 2 + offsetY, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    scratchedPixels.current += 1;

    // Add sparkle effect every few scratches
    if (scratchedPixels.current % 3 === 0) {
      addSparkle(x, y);
    }

    if (scratchedPixels.current > 10 && !isScratched) {
      setIsScratched(true);
      onReveal();
    }
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    isDrawing.current = true;
    handleMove(e);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    let x: number, y: number;

    if ("touches" in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    scratch(x, y);
  };

  const handleEnd = () => {
    isDrawing.current = false;
  };

  return (
    <div 
      ref={containerRef}
      className={`scratch-card scratch-card-enter relative h-28 rounded-2xl flex flex-col items-center justify-center overflow-hidden ${
        isDark 
          ? "bg-gradient-to-br from-gray-700 via-gray-750 to-gray-800 shadow-lg shadow-purple-500/20" 
          : "bg-gradient-to-br from-pink-100 via-pink-50 to-white shadow-lg shadow-pink-500/30"
      } ${isScratched ? (isWinning ? "winner revealed" : "loser revealed") : ""}`}
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      {/* Background glow for winning cards */}
      {isScratched && isWinning && (
        <div className="absolute inset-0 bg-gradient-to-br from-green-400/20 to-emerald-500/20 animate-pulse" />
      )}
      
      {prize.image_url ? (
        <img 
          src={prize.image_url} 
          alt={prize.name} 
          className={`w-12 h-12 rounded-lg object-cover mb-1 transition-transform duration-300 ${
            isScratched ? "scale-110" : ""
          }`} 
        />
      ) : (
        <span className={`text-3xl mb-1 transition-all duration-300 ${
          isScratched ? "scale-125" : ""
        }`}>
          {isWinning ? "🏆" : prize.emoji}
        </span>
      )}
      <span className={`text-xs font-bold text-center px-2 transition-all duration-300 ${
        isWinning 
          ? "text-green-500" 
          : isDark ? "text-gray-400" : "text-pink-400"
      } ${isScratched ? "opacity-100" : "opacity-70"}`}>
        {isWinning ? "🎉 GANHOU!" : "Tente de novo"}
      </span>
      
      {/* Sparkle effects */}
      {sparkles.map((sparkle) => (
        <div
          key={sparkle.id}
          className="sparkle"
          style={{ left: sparkle.x - 4, top: sparkle.y - 4 }}
        />
      ))}
      
      {!isScratched && (
        <canvas
          ref={canvasRef}
          className="scratch-canvas"
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        />
      )}
    </div>
  );
}
