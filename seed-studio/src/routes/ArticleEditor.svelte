<script lang="ts">
  import { submitArticle } from '$lib/api';

  import { Button } from '$lib/components/ui/button/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import * as Alert from '$lib/components/ui/alert/index.js';
  import * as Select from '$lib/components/ui/select/index.js';
  import { Textarea } from '$lib/components/ui/textarea/index.js';

  interface Props {
    apiToken: string;
  }

  let { apiToken }: Props = $props();

  // Form State
  let form = $state({ title: '', slug: '', category: 'Technology', description: '', content: '' });
  let isSubmitting = $state(false);
  let formMessage = $state('');
  let formStatus = $state('');

  async function handleSubmitArticle(e: Event) {
    e.preventDefault();
    isSubmitting = true;
    formMessage = '';
    try {
      const data = await submitArticle(form, apiToken);
      formStatus = 'success';
      formMessage = `Article created successfully! (ID: ${data.id})`;
      form = { title: '', slug: '', category: 'Technology', description: '', content: '' };
    } catch (err: unknown) {
      formStatus = 'error';
      formMessage = `Error: ${(err as Error).message}`;
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div class="max-w-3xl mx-auto">
  <div class="bg-muted/50 border border-border rounded-2xl p-8 shadow-xl">
    <h2 class="text-2xl font-bold text-foreground mb-2">Create Article On-Demand</h2>
    <p class="text-muted-foreground mb-8">Push a new article directly to Strapi without modifying CSV files manually.</p>

    <form onsubmit={handleSubmitArticle} class="space-y-6">
      <div>
        <Label class="text-foreground mb-2 block">Title <span class="text-destructive">*</span></Label>
        <Input bind:value={form.title} required placeholder="e.g. 5 Trends in AI Data Analysis" />
      </div>

      <div class="grid grid-cols-2 gap-6">
        <div>
          <Label class="text-foreground mb-2 block">Slug</Label>
          <Input bind:value={form.slug} placeholder="auto-generated-if-empty" />
        </div>
        <div>
          <Label id="category-label" class="text-foreground mb-2 block">Category</Label>
          <Select.Root type="single" bind:value={form.category}>
            <Select.Trigger aria-labelledby="category-label">
              {form.category}
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="Technology">Technology</Select.Item>
              <Select.Item value="Business">Business</Select.Item>
              <Select.Item value="Lifestyle">Lifestyle</Select.Item>
            </Select.Content>
          </Select.Root>
        </div>
      </div>

      <div>
        <Label class="text-foreground mb-2 block">Description</Label>
        <Input bind:value={form.description} placeholder="A short catchy summary..." />
      </div>

      <div>
        <Label id="content-label" class="text-foreground mb-2 block">Content (Markdown / Text)</Label>
        <Textarea bind:value={form.content} rows={6} placeholder="Write your article content here..." aria-labelledby="content-label" />
      </div>

      {#if formMessage}
        <Alert.Root variant={formStatus === 'success' ? 'default' : 'destructive'} class={formStatus === 'success' ? 'bg-success/10 text-success border-success/20' : ''}>
          <Alert.Description>{formMessage}</Alert.Description>
        </Alert.Root>
      {/if}

      <Button type="submit" disabled={isSubmitting} size="lg" class="w-full">
        {isSubmitting ? 'Publishing...' : 'Publish to Strapi'}
      </Button>
    </form>
  </div>
</div>
