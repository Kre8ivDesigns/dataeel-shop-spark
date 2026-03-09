import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const AdminSettings = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 text-foreground/50 hover:text-foreground mb-6 transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin
          </Link>
          <h1 className="text-2xl font-bold text-foreground mb-6">Admin Settings</h1>
          <Tabs defaultValue="openrouter">
            <TabsList>
              <TabsTrigger value="openrouter">OpenRouter</TabsTrigger>
              <TabsTrigger value="smtp">SMTP</TabsTrigger>
              <TabsTrigger value="captcha">CAPTCHA</TabsTrigger>
              <TabsTrigger value="stripe">Stripe</TabsTrigger>
            </TabsList>
            <TabsContent value="openrouter">
              <Card className="bg-card border-border">
                <CardHeader><CardTitle className="text-foreground">OpenRouter Settings</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">Model selection and connection status will be here.</p>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="smtp">
              <Card className="bg-card border-border">
                <CardHeader><CardTitle className="text-foreground">SMTP Settings</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">SMTP configuration will be here.</p>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="captcha">
              <Card className="bg-card border-border">
                <CardHeader><CardTitle className="text-foreground">CAPTCHA Settings</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">CAPTCHA settings will be here.</p>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="stripe">
              <Card className="bg-card border-border">
                <CardHeader><CardTitle className="text-foreground">Stripe Settings</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">Stripe settings and connection status will be here.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminSettings;
