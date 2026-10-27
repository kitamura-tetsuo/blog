export const locales = ['en', 'ja'] as const;
export const projects = ['auto-coder', 'outliner'] as const;
export const labels = {
  en: { title: 'Development notes', intro: 'Records of building software, grounded in public source and history.', projects: 'Projects', articles: 'Latest entries', empty: 'No entries yet.', back: 'All entries', language: 'Language', evidence: 'Sources' },
  ja: { title: '開発の記録', intro: '公開されたソースと履歴をもとに、ソフトウェア開発を記録します。', projects: 'プロジェクト', articles: '最新の記事', empty: '記事はまだありません。', back: '記事一覧', language: '言語', evidence: '資料' }
};
export const pathFor = (post: any) => `/${post.data.locale}/${post.data.project}/${post.data.slug}/`;
