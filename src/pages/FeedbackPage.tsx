import {
  CheckCircle2,
  MessageCircle,
  Search,
  Send,
  ThumbsUp,
} from "lucide-react";
import {
  useMemo,
  useState,
} from "react";

interface FeedbackPost {
  id: number;
  author: string;
  initials: string;
  title: string;
  message: string;
  category: string;
  likes: number;
  comments: number;
  time: string;
}

const initialPosts: FeedbackPost[] = [
  {
    id: 1,
    author: "KelvinLive creator",
    initials: "KC",
    title: "What should we build next?",
    message:
      "Share an idea, feature request, problem, or improvement you would like to see in KelvinLive.",
    category: "Ideas",
    likes: 12,
    comments: 4,
    time: "Today",
  },
  {
    id: 2,
    author: "Community",
    initials: "CO",
    title: "Tell us about your experience",
    message:
      "What is working well for you, and what should we make easier?",
    category: "Experience",
    likes: 8,
    comments: 3,
    time: "Today",
  },
];

const categories = [
  "All",
  "Ideas",
  "Experience",
  "Bug",
  "Question",
];

export function FeedbackPage() {
  const [posts, setPosts] =
    useState<FeedbackPost[]>(initialPosts);

  const [search, setSearch] =
    useState("");

  const [selectedCategory, setSelectedCategory] =
    useState("All");

  const [newMessage, setNewMessage] =
    useState("");

  const [sent, setSent] =
    useState(false);

  const filteredPosts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return posts.filter((post) => {
      const matchesCategory =
        selectedCategory === "All" ||
        post.category === selectedCategory;

      const matchesSearch =
        !query ||
        post.title
          .toLowerCase()
          .includes(query) ||
        post.message
          .toLowerCase()
          .includes(query) ||
        post.category
          .toLowerCase()
          .includes(query);

      return (
        matchesCategory &&
        matchesSearch
      );
    });
  }, [
    posts,
    search,
    selectedCategory,
  ]);

  function submitFeedback(): void {
    const message = newMessage.trim();

    if (!message) {
      return;
    }

    const post: FeedbackPost = {
      id: Date.now(),
      author: "You",
      initials: "YO",
      title: "New feedback",
      message,
      category: "Experience",
      likes: 0,
      comments: 0,
      time: "Just now",
    };

    setPosts((current) => [
      post,
      ...current,
    ]);

    setNewMessage("");
    setSent(true);

    window.setTimeout(() => {
      setSent(false);
    }, 2500);
  }

  function likePost(id: number): void {
    setPosts((current) =>
      current.map((post) =>
        post.id === id
          ? {
              ...post,
              likes: post.likes + 1,
            }
          : post,
      ),
    );
  }

  return (
    <div
      className="space-y-8"
      data-testid="page-feedback"
    >
      <div>
        <p className="eyebrow">
          Community
        </p>

        <h1 className="mt-3 text-3xl font-extrabold tracking-[-.05em] sm:text-4xl">
          Your feedback matters.
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
          Share ideas, report problems, ask questions,
          and help shape what KelvinLive becomes.
        </p>
      </div>

      <div className="panel rounded-2xl p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl border border-cyan-300/20 bg-cyan-300/[.06]">
            <MessageCircle
              size={18}
              className="text-cyan-300"
            />
          </div>

          <div>
            <p className="text-sm font-bold">
              Start a conversation
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Tell the community what you think.
            </p>
          </div>
        </div>

        <textarea
          value={newMessage}
          onChange={(event) =>
            setNewMessage(
              event.target.value,
            )
          }
          rows={4}
          placeholder="Write your feedback, idea, question or problem..."
          className="mt-5 w-full resize-none rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-slate-200 outline-none placeholder:text-slate-600 focus:border-cyan-300/40"
          data-testid="textarea-feedback"
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-600">
            Please keep feedback respectful and useful.
          </p>

          <button
            type="button"
            onClick={submitFeedback}
            disabled={!newMessage.trim()}
            className="btn-primary flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
            data-testid="button-submit-feedback"
          >
            <Send size={15} />
            Post feedback
          </button>
        </div>

        {sent ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-300/[.05] p-3 text-xs text-emerald-200">
            <CheckCircle2 size={15} />
            Your feedback has been added.
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-md">
          <Search
            size={17}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600"
          />

          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder="Search feedback..."
            className="w-full rounded-xl border border-white/10 bg-white/[.03] py-3 pl-11 pr-4 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-cyan-300/30"
            data-testid="input-search-feedback"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              type="button"
              key={category}
              onClick={() =>
                setSelectedCategory(
                  category,
                )
              }
              className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                selectedCategory ===
                category
                  ? "border-cyan-300/30 bg-cyan-300/[.08] text-cyan-200"
                  : "border-white/10 bg-white/[.03] text-slate-500 hover:text-slate-300"
              }`}
              data-testid={`button-feedback-category-${category.toLowerCase()}`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filteredPosts.length === 0 ? (
          <div className="panel rounded-2xl p-8 text-center">
            <Search
              size={24}
              className="mx-auto text-slate-600"
            />

            <p className="mt-3 text-sm font-semibold text-slate-300">
              No feedback found.
            </p>

            <p className="mt-1 text-xs text-slate-600">
              Try another search or category.
            </p>
          </div>
        ) : (
          filteredPosts.map((post) => (
            <article
              key={post.id}
              className="panel rounded-2xl p-5 sm:p-6"
              data-testid={`feedback-post-${post.id}`}
            >
              <div className="flex gap-4">
                <div className="grid size-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[.04] text-xs font-bold text-cyan-200">
                  {post.initials}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold">
                        {post.author}
                      </p>

                      <p className="mt-1 text-xs text-slate-600">
                        {post.time}
                      </p>
                    </div>

                    <span className="rounded-full border border-white/10 bg-white/[.03] px-2.5 py-1 text-[.68rem] font-semibold text-slate-500">
                      {post.category}
                    </span>
                  </div>

                  <h2 className="mt-5 text-base font-bold text-slate-100">
                    {post.title}
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {post.message}
                  </p>

                  <div className="mt-5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        likePost(post.id)
                      }
                      className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[.03] px-3 py-2 text-xs font-semibold text-slate-400 hover:bg-white/[.07] hover:text-cyan-200"
                      data-testid={`button-like-feedback-${post.id}`}
                    >
                      <ThumbsUp size={14} />
                      {post.likes}
                    </button>

                    <button
                      type="button"
                      className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[.03] px-3 py-2 text-xs font-semibold text-slate-400 hover:bg-white/[.07] hover:text-cyan-200"
                      data-testid={`button-comments-feedback-${post.id}`}
                    >
                      <MessageCircle size={14} />
                      {post.comments}
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
