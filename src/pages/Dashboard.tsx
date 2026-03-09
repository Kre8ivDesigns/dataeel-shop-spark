import { useState } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  CreditCard,
  Download,
  TrendingUp,
  DollarSign,
  Zap,
  Eye,
  ShoppingCart,
  Settings,
  BarChart3,
  Clock,
  MapPin,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { sanitizeError } from "@/lib/errorHandler";

const stats = [
  { label: "Credits Remaining", value: "12", icon: CreditCard, trend: null, accent: true },
  { label: "Downloads This Month", value: "23", icon: Download, trend: "+8 vs last month", trendUp: true },
  { label: "Win Rate (Concert™)", value: "68%", icon: TrendingUp, trend: "+3% this week", trendUp: true },
  { label: "Total Saved", value: "$340", icon: DollarSign, trend: "vs traditional methods", trendUp: true },
];

const recentDownloads = [
  { track: "Gulfstream Park", date: "Feb 9, 2026", races: 11, time: "2 hours ago" },
  { track: "Santa Anita", date: "Feb 9, 2026", races: 9, time: "3 hours ago" },
  { track: "Aqueduct", date: "Feb 8, 2026", races: 8, time: "Yesterday" },
  { track: "Tampa Bay Downs", date: "Feb 8, 2026", races: 10, time: "Yesterday" },
  { track: "Fair Grounds", date: "Feb 7, 2026", races: 9, time: "2 days ago" },
];

const upcomingRaces = [
  { track: "Churchill Downs", date: "Feb 10", races: 10, available: true },
  { track: "Del Mar", date: "Feb 10", races: 8, available: true },
  { track: "Belmont Park", date: "Feb 11", races: 9, available: false },
];

const Dashboard = () => {
  const { toast } = useToast();
  const [portalLoading, setPortalLoading] = useState(false);

  const openCustomerPortal = async () => {
    setPortalLoading(true);
    const { data, error } = await supabase.functions.invoke("customer-portal");
    setPortalLoading(false);
    if (error || data?.error) {
      toast({
        title: "Unable to open billing portal",
        description: data?.error || sanitizeError(error),
        variant: "destructive",
      });
    } else if (data?.url) {
      window.open(data.url, "_blank");
    }
  };

  const quickActions = [
    { label: "Download Today's Cards", icon: Zap, href: "/racecards", primary: true },
    { label: "View Live Races", icon: Eye, href: "#", live: true },
    { label: "Buy Credits", icon: ShoppingCart, href: "/buy-credits" },
    { label: "Manage Account", icon: Settings, href: "/account-settings" },
    { label: "Billing", icon: CreditCard, onClick: openCustomerPortal, href: "#" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Welcome */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-foreground font-heading tracking-tight">
              Welcome back, <span className="text-neon">Bettor</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Here's your racing analytics overview for today.
            </p>
          </motion.div>

          {/* Stats Row */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="stat-card"
              >
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-3">
                  <stat.icon className={`h-5 w-5 ${stat.accent ? "text-primary" : "text-foreground/60"}`} />
                </div>
                <div className={`text-3xl font-bold font-mono-data ${stat.accent ? "text-primary" : "text-foreground"}`}>
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                {stat.trend && (
                  <div className={`text-xs mt-2 ${stat.trendUp ? "text-success" : "text-destructive"}`}>
                    {stat.trendUp ? "↑" : "↓"} {stat.trend}
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8"
          >
            <h2 className="text-lg font-semibold text-foreground mb-4 font-heading">Quick Actions</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((action) => {
                const content = (
                  <div
                    className={`relative card-dark flex items-center gap-4 group ${
                      action.primary ? "border-primary/50" : ""
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      action.primary ? "bg-primary/20" : "bg-muted"
                    }`}>
                      <action.icon className={`h-6 w-6 ${action.primary ? "text-primary" : "text-foreground/60"}`} />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground text-sm">{action.label}</div>
                      {action.live && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                          </span>
                          <span className="text-xs text-primary font-medium">3 tracks live</span>
                        </div>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-foreground/30 ml-auto group-hover:text-foreground/60 transition-colors" />
                  </div>
                );

                if (action.onClick) {
                  return (
                    <button key={action.label} onClick={action.onClick} disabled={portalLoading}>
                      {content}
                    </button>
                  );
                }

                return (
                  <Link key={action.label} to={action.href}>
                    {content}
                  </Link>
                );
              })}
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Recent Downloads */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="lg:col-span-2"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground font-heading">Recent Downloads</h2>
                <Button variant="ghost" size="sm" className="text-primary text-xs hover:text-primary/80">
                  View All History →
                </Button>
              </div>
              <div className="card-dark divide-y divide-border">
                {recentDownloads.map((dl, i) => (
                  <div key={i} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                        <MapPin className="h-4 w-4 text-foreground/50" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground text-sm">{dl.track}</div>
                        <div className="text-xs text-muted-foreground">{dl.date} · {dl.races} races</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{dl.time}</span>
                      <Button variant="ghost" size="sm" className="text-xs text-foreground/60 hover:text-foreground">
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Upcoming Races + Performance */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="space-y-6"
            >
              {/* Upcoming */}
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-4 font-heading">Upcoming Races</h2>
                <div className="space-y-3">
                  {upcomingRaces.map((race, i) => (
                    <div key={i} className="card-dark flex items-center justify-between">
                      <div>
                        <div className="font-medium text-foreground text-sm">{race.track}</div>
                        <div className="text-xs text-muted-foreground">{race.date} · {race.races} races</div>
                      </div>
                      {race.available ? (
                        <Button size="sm" className="bg-primary text-primary-foreground hover:brightness-110 text-xs">
                          Download
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                          Coming Soon
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Performance */}
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-4 font-heading">Algorithm Performance</h2>
                <div className="card-dark space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground/80">Concert™ Win Rate</span>
                    <span className="font-mono-data font-bold text-primary">68%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{ width: "68%" }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground/80">Aptitude™ Win Rate</span>
                    <span className="font-mono-data font-bold text-info">71%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-info h-2 rounded-full" style={{ width: "71%" }} />
                  </div>
                  <div className="pt-2 border-t border-border">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Last 30 days · 47 races analyzed</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Low Credits Warning */}
              <div className="rounded-xl p-4 border border-warning/30 bg-warning/5">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-foreground">Credits Running Low</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      You have 12 credits remaining. Stock up before the weekend races!
                    </p>
                    <Link to="/buy-credits">
                      <Button size="sm" className="mt-3 bg-warning text-warning-foreground hover:brightness-110 text-xs">
                        Buy More Credits
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;
