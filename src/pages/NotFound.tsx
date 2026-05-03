import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageHero } from "@/components/PageHero";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PageHero
        backTo="/"
        backLabel="Return to Home"
        badge="404"
        title={
          <>
            Page <span className="text-neon">not found</span>
          </>
        }
        subtitle="That URL doesn’t match anything on this site. Check the address or go back to the homepage."
        align="center"
        actions={
          <Button asChild className="bg-primary text-primary-foreground font-semibold">
            <Link to="/">Go to homepage</Link>
          </Button>
        }
        sectionClassName="pb-10"
      />
      <main className="pb-16" />
      <Footer />
    </div>
  );
};

export default NotFound;
