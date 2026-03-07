import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const AdminSettings = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Settings</h1>
      <Tabs defaultValue="openrouter">
        <TabsList>
          <TabsTrigger value="openrouter">OpenRouter</TabsTrigger>
          <TabsTrigger value="smtp">SMTP</TabsTrigger>
          <TabsTrigger value="captcha">CAPTCHA</TabsTrigger>
          <TabsTrigger value="stripe">Stripe</TabsTrigger>
        </TabsList>
        <TabsContent value="openrouter">
          <Card>
            <CardHeader>
              <CardTitle>OpenRouter Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Model selection and connection status will be here.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="smtp">
          <Card>
            <CardHeader>
              <CardTitle>SMTP Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p>SMTP configuration will be here.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="captcha">
          <Card>
            <CardHeader>
              <CardTitle>CAPTCHA Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p>CAPTCHA settings will be here.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="stripe">
          <Card>
            <CardHeader>
              <CardTitle>Stripe Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Stripe settings and connection status will be here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSettings;
