import { Link, Navigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, CalendarDays, Clock, Newspaper } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageHero } from "@/components/PageHero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import heroRacingImage from "@/assets/hero-racing.jpg";
import {
  getFeaturedInsight,
  getInsightBySlug,
  getRelatedInsights,
  insightArticles,
  type InsightArticle,
} from "@/lib/insights";

function formatInsightDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00Z`));
}

function ArticleMeta({ article }: { article: InsightArticle }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-foreground/55">
      <span className="inline-flex items-center gap-1.5">
        <CalendarDays className="h-3.5 w-3.5 text-primary" />
        {formatInsightDate(article.publishedAt)}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5 text-primary" />
        {article.readMinutes} min read
      </span>
    </div>
  );
}

function InsightCard({ article, index }: { article: InsightArticle; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
      className="rounded-lg border border-border bg-card p-6 shadow-sm transition hover:border-primary/40 hover:shadow-neon/20"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <Badge variant="secondary" className="rounded-md">
          {article.category}
        </Badge>
        <ArticleMeta article={article} />
      </div>
      <h2 className="mb-3 font-heading text-2xl font-bold leading-tight text-foreground">
        <Link to={`/insights/${article.slug}`} className="hover:text-primary">
          {article.title}
        </Link>
      </h2>
      <p className="mb-5 text-sm leading-relaxed text-muted-foreground">{article.summary}</p>
      <Link
        to={`/insights/${article.slug}`}
        className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80"
      >
        Read insight
        <ArrowRight className="h-4 w-4" />
      </Link>
    </motion.article>
  );
}

function InsightsIndex() {
  const featured = getFeaturedInsight();
  const remaining = insightArticles.filter((article) => article.slug !== featured.slug);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PageHero
        badge="Insights"
        title={
          <>
            Racing knowledge for <span className="text-neon">better reads</span>
          </>
        }
        subtitle="Practical articles on RaceCard strategy, betting vocabulary, track conditions, and responsible ways to think through a day at the races."
        align="left"
        actions={
          <>
            <Button asChild className="bg-primary text-primary-foreground hover:brightness-110">
              <Link to={`/insights/${featured.slug}`}>Read featured insight</Link>
            </Button>
            <Button asChild variant="outline" className="border-border text-foreground hover:bg-muted">
              <Link to="/racecards">Browse RaceCards</Link>
            </Button>
          </>
        }
        aside={
          <div className="overflow-hidden rounded-lg border border-white/10 bg-card/90 shadow-2xl">
            <div className="relative aspect-[16/9] bg-black">
              <img
                src={heroRacingImage}
                alt="Thoroughbred racehorses running on a track"
                className="h-full w-full object-cover opacity-85"
                loading="eager"
                decoding="async"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
              <div className="absolute bottom-4 left-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/90">
                <Newspaper className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
            <div className="p-6">
              <Badge className="mb-4 rounded-md bg-primary text-primary-foreground">Featured</Badge>
              <h2 className="mb-3 font-heading text-2xl font-bold leading-tight text-foreground">{featured.title}</h2>
              <p className="mb-5 text-sm leading-relaxed text-muted-foreground">{featured.summary}</p>
              <ArticleMeta article={featured} />
            </div>
          </div>
        }
        sectionClassName="pb-10 lg:pb-12"
      />

      <main className="py-16">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="font-heading text-2xl font-bold text-foreground">Latest insights</h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <InsightCard article={featured} index={0} />
            {remaining.map((article, index) => (
              <InsightCard key={article.slug} article={article} index={index + 1} />
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function InsightDetail({ article }: { article: InsightArticle }) {
  const related = getRelatedInsights(article.slug);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PageHero
        backTo="/insights"
        backLabel="Back to Insights"
        badge={article.category}
        title={article.title}
        subtitle={article.dek}
        align="left"
        actions={<ArticleMeta article={article} />}
        sectionClassName="pb-10"
      />

      <main className="py-16">
        <div className="container mx-auto grid gap-12 px-4 lg:grid-cols-[minmax(0,0.72fr)_minmax(280px,0.28fr)]">
          <article className="min-w-0 space-y-10">
            {article.sections.map((section) => (
              <section key={section.heading} className="scroll-mt-28">
                <h2 className="mb-4 font-heading text-2xl font-bold text-foreground">{section.heading}</h2>
                <div className="space-y-4 text-base leading-relaxed text-muted-foreground">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </article>

          <aside className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="mb-4 font-heading text-lg font-bold text-foreground">Continue reading</h2>
              <div className="space-y-3">
                {article.relatedLinks.map((link) => (
                  <Button key={link.href} asChild variant="outline" className="w-full justify-between border-border">
                    <Link to={link.href}>
                      {link.label}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="mb-4 font-heading text-lg font-bold text-foreground">Related insights</h2>
              <div className="space-y-4">
                {related.map((relatedArticle) => (
                  <Link
                    key={relatedArticle.slug}
                    to={`/insights/${relatedArticle.slug}`}
                    className="block rounded-md border border-border bg-background p-4 transition hover:border-primary/40"
                  >
                    <span className="mb-2 block text-xs font-semibold text-primary">{relatedArticle.category}</span>
                    <span className="block text-sm font-semibold leading-snug text-foreground">{relatedArticle.title}</span>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}

const Insights = () => {
  const { slug } = useParams();

  if (!slug) return <InsightsIndex />;

  const article = getInsightBySlug(slug);
  if (!article) return <Navigate to="/insights" replace />;

  return <InsightDetail article={article} />;
};

export default Insights;
