# Croslin Law website: how to add blog posts

This folder is the whole website. Blog posts are plain text files. When you save one on GitHub, Netlify turns it into a finished page on your site within a minute or two. You never have to rebuild the website to publish a post.

## Part 1. One-time setup (about 30 minutes)

### Step 1. Put the folder on GitHub
1. Go to **github.com** and create a free account.
2. Click **New repository**. Name it `croslin-law-site`. Choose **Private**. Click **Create repository**.
3. On the next page click **uploading an existing file**.
4. Unzip the file you downloaded. Open the unzipped folder, select **everything inside it**, and drag it into the GitHub page. The project has 58 files, which is under GitHub's limit of 100 per upload.
5. Wait for the uploads to finish, then click **Commit changes**.

### Step 2. Connect GitHub to Netlify
There are two ways. Try the first. If you do not see the option, use the second.

**A. Link your existing Netlify site (best, because the domain and forms stay as they are)**
1. In Netlify, open your site, then **Site configuration**, then **Build & deploy**, then **Continuous deployment**.
2. Click **Link repository**, choose GitHub, and pick `croslin-law-site`.
3. Netlify reads the settings from the file called `netlify.toml`, so you can leave the build fields alone. They should say: build command `node build-blog.js`, publish folder `dist`.
4. Click **Save**, then go to **Deploys** and choose **Trigger deploy**.

**B. Make a new Netlify site from GitHub, then move the domain**
1. In Netlify click **Add new project**, then **Import an existing project**, then GitHub, then `croslin-law-site`. Click **Deploy**.
2. Open the new site's address (it ends in `.netlify.app`) and look it over.
3. In the old site, go to **Domain management** and remove `croslinlawoffice.com`. In the new site, add it. If your DNS at Porkbun points at the old site's name, change it to the new site's name when Netlify tells you to.
4. Check the **Forms** tab on the new site, and set up your notifications again.

After either option, send yourself a test message through the contact form to make sure it still arrives.

## Part 2. Adding a blog post (every time)

1. Open your repository on GitHub. Click the folder **content**, then **blog**.
2. Click **Add file**, then **Create new file**.
3. In the name box, type a short name using only lowercase letters, numbers, and dashes, and end it with `.md`. Example: `how-probate-works.md`. This name becomes the web address (`/blog/how-probate-works/`).
4. Open the file `_example-post.md` in the same folder, copy everything in it, and paste it into your new file. Replace the example text with yours (details below).
5. Click **Commit changes**, then **Commit changes** again.
6. Watch it publish. In Netlify, open **Deploys**. In one to two minutes the newest deploy says **Published**. Your post is now on the site.

**If the deploy says Failed:** click it, open the log, and read the message near the bottom. It says what to fix in plain words, for example "Missing description." Fix the file on GitHub and save again. A failed build never breaks your live site. The last good version stays up.

### The top section of every post
Every post starts with a section between two lines of three dashes. It looks like this:

```
---
title: What happens to debts when someone dies in Oklahoma?
date: 2026-10-20
description: A plain-language look at which debts are paid from an estate, and when family members are responsible.
topic: Probate
related: probate, estate-planning
draft: false
---
```

| Line | What to put | Required? |
|---|---|---|
| `title` | The headline. Aim for 60 characters or fewer. | Yes |
| `date` | The publishing date, as year-month-day. | Yes |
| `description` | One or two sentences, 70 to 160 characters. It shows in Google results and on the blog page. | Yes |
| `topic` | A short label such as Family Law, Probate, or Criminal Defense. | No |
| `related` | The practice pages the post links to at the bottom, separated by commas. Choices: `adoption`, `asset-protection`, `child-support`, `criminal-defense`, `custody-and-visitation`, `divorce`, `estate-planning`, `expungements`, `grandparents-rights`, `guardianship`, `prenuptial-agreements`, `probate`, `protective-orders` | No |
| `draft` | `true` keeps the post unpublished. Change to `false` (or delete the line) to publish. | No |
| `updated` | A date, if you revise the post later. | No |
| `author` | Only if the author is not Brayden. | No |
| `image` and `imageAlt` | A picture at the top of the post and a one-sentence description of it. See "Pictures" below. | No |

### Writing the post
Write below the second line of dashes. Plain text works. A few simple marks add formatting:

| You type | You get |
|---|---|
| `## A heading` | A section heading. Start your headings with `##`, not `#`. |
| `### A smaller heading` | A sub-heading |
| `**bold**` | **bold** |
| `*italic*` | *italic* |
| `- item` on each line | A bullet list |
| `1. item` on each line | A numbered list |
| `> quote` | A highlighted quote |
| `[words](/practice/divorce/)` | A link to another page on your site |

**Linking to your own pages:** use the form `/practice/divorce/`, with a slash at the front and the end. Links to other websites use the full address, such as `https://www.oscn.net`.

**Every post automatically gets:** your name and the date, the "not legal advice" note, the related pages you listed, a call button, a place on the blog list, an entry in the sitemap, a share preview, an RSS feed, and a place in the site search.

### Changing or removing a post
- **Change it:** open the file on GitHub, click the pencil icon, edit, and commit.
- **Hide it without deleting it:** change the draft line to `draft: true` and commit.
- **Delete it:** open the file, click the trash can icon, and commit.

### Pictures (optional)
1. In the repository, open **site**, then **images**, and create a folder called `blog` if it is not there.
2. Click **Add file**, then **Upload files**, and add your picture. Use a JPG under 300 KB.
3. In the post's top section, add:
```
image: /images/blog/my-picture.jpg
imageAlt: A short sentence that describes the picture
```

## Part 3. Going public on Google
Right now the whole site tells Google not to list it. When your address and headshots are in and you are ready:
1. Open the file `site.config.json` on GitHub.
2. Change `"indexable": false` to `"indexable": true`.
3. Commit. In a minute or two every page, including your posts, is open to Google.

The payment page, the thank-you page, and the "page not found" page stay hidden from Google on purpose.

## Part 4. Changes to the rest of the site
The folders called `site` and `templates` hold the rest of the website: the home page, the practice pages, the styles, and the photos. When Claude rebuilds the site (a new address, headshots, wording changes), you will get a new zip. Unzip it, open your repository, and use **Add file**, then **Upload files** to upload the new `site` and `templates` folders over the old ones. Your blog posts in `content` are not touched.

Old files with changed names can pile up in `site/assets`. They are harmless, and you can delete them whenever you like.

## What is in this folder
| Name | What it does |
|---|---|
| `content/blog` | Your blog posts. This is the only place you work day to day. |
| `site.config.json` | The go-public switch and the author name |
| `build-blog.js` | The small program that turns posts into pages |
| `templates` | The page design that posts are placed into |
| `site` | The finished website pages, styles, fonts, and photos |
| `netlify.toml` | Tells Netlify how to build the site |
| `package.json` and `package-lock.json` | List the one tool the builder uses |
