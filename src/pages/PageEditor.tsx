import 'grapesjs/dist/css/grapes.min.css';
import GrapesJS from 'grapesjs';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { sanitizeError } from '@/lib/errorHandler';

const PageEditor = () => {
  const editorEl = useRef(null);
  const { toast } = useToast();
  const [editor, setEditor] = useState<any>(null);
  const [slug, setSlug] = useState('homepage');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editorEl.current) {
      const editorInstance = GrapesJS.init({
        container: editorEl.current,
        fromElement: true,
        height: 'calc(100vh - 120px)',
        width: 'auto',
        storageManager: false,
        plugins: ['gjs-preset-webpage'],
        pluginsOpts: {
          'gjs-preset-webpage': {},
        },
      });
      setEditor(editorInstance);
    }
  }, []);

  const loadPage = async () => {
    if (!editor || !slug) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('pages')
      .select('html, css')
      .eq('slug', slug)
      .single();

    if (error && error.code !== 'PGRST116') { // Ignore 'not found' errors
      toast({ title: 'Error loading page', description: sanitizeError(error), variant: 'destructive' });
    } else if (data) {
      editor.setComponents(data.html || '');
      editor.setStyle(data.css || '');
    } else {
      // If no page is found, clear the editor
      editor.setComponents('');
      editor.setStyle('');
    }
    setLoading(false);
  };

  const savePage = async () => {
    if (!editor || !slug) return;
    setLoading(true);
    const html = editor.getHtml();
    const css = editor.getCss();

    const { error } = await supabase.from('pages').upsert({ slug, html, css });

    if (error) {
      toast({ title: 'Error saving page', description: sanitizeError(error), variant: 'destructive' });
    } else {
      toast({ title: 'Page saved successfully' });
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPage();
  }, [editor, slug]);

  return (
    <div className="h-screen flex flex-col">
        <div className="p-4 bg-card border-b border-border flex items-center gap-4">
            <Input 
                value={slug} 
                onChange={(e) => setSlug(e.target.value)} 
                placeholder="Enter page slug (e.g. homepage)" 
            />
            <Button onClick={savePage} disabled={loading || !slug}>Save</Button>
        </div>
        <div ref={editorEl} className="flex-grow" />
    </div>
  );
};

export default PageEditor;
