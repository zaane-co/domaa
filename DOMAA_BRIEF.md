# Domaa: Product and Business Brief

A reference for building Domaa's brand identity. It covers what the product is, how it works, who it serves, how it will make money, and the brand direction that follows from all of that.

---

## 1. What Domaa is

Domaa is a domain name finder. You type a business idea in plain words (for example, "organic dog treats") and Domaa returns domain names that are **actually free to register right now**.

Most domain tools show you suggestions that turn out to be taken. Domaa checks every suggestion live against the official domain registries before showing it. Available names come first, and taken ones are hidden by default.

**One-line summary:** Type an idea, get domains you can really buy.

---

## 2. How it works

### Step 1: You describe your idea
One search box, plus two optional controls:
- **Max price per year:** hide domains above your budget.
- **More extensions:** check a wider list of endings (.io, .ai, .shop and others) beyond the defaults.

### Step 2: Domaa generates name ideas
Domaa turns your words into up to 13 name ideas using built-in rules and word lists (no AI yet). From "organic dog treats" it creates:

| Type | What it does | Example |
|---|---|---|
| Exact | Joins your words | organicdogtreats, organic-dog-treats |
| Shorter | Drops the weakest word, makes an acronym, reverses word order | organictreats, odt |
| Prefix | Adds get, try, use, go, my, join, hey | getdogtreats |
| Suffix | Adds ly, ify, hq, hub, labs, kit, spot, zone, now, app | dogtreatshub |
| Synonym | Swaps one word for a similar one | naturaldogtreats, puptreats |
| Stylized | Removes vowels | dgtrts |

Exact matches rank highest. Long names (over 25 characters) and hyphenated names rank lower.

### Step 3: Domaa checks real availability
Each name is checked against 8 default extensions: **.com, .dev, .app, .xyz, .online, .org, .tech, .info**. That is up to about 100 live checks per search, run in parallel.

Checks use **RDAP**, the official system that replaced WHOIS, run by the domain registries themselves. Each domain gets one of three results:
- **Available:** the registry confirms nobody owns it.
- **Taken:** it is registered.
- **Unknown:** the registry did not answer in time.

**Honesty rule:** Domaa never marks a domain "available" unless the registry confirms it. An uncertain answer is shown as unknown, because telling someone a taken name is free is worse than saying "not sure".

### Step 4: Prices and buy links
Each result shows an estimated first-year price (for example, .xyz about $2, .com about $12, .ai about $70) and buttons to buy at **Namecheap** or **GoDaddy**. Domaa does not sell domains itself yet.

### Step 5: Results
Results are grouped as **Available**, then **Unknown**, then **Taken** (collapsed). Within each group, cheaper domains come first.

### Safeguards
- **Rate limit:** 15 searches per person every 10 minutes, to protect the registries and the service.
- **Caching:** recent checks are remembered for a few minutes, so repeat searches are fast.

---

## 3. Current state and known gaps

Domaa is a working MVP: a single page, running locally.

- **Missing extensions:** .io, .co and .me are not checked yet, because their registries do not offer the public lookup service Domaa uses.
- **Estimated prices:** prices are fixed estimates, not live prices from registrars.
- **Rule-based ideas:** name ideas come from word lists, so they are practical but not very creative or "brandable" yet.
- **No brand yet:** the design is plain gray and black with no logo, colors, or identity. This brief exists to fix that.
- **No revenue yet:** buy links go to registrars without affiliate tracking.

---

## 4. How Domaa makes money

### Phase 1: Affiliate links (now)
- **How it works:** replace the Namecheap and GoDaddy buy links with affiliate tracking links. Domaa earns a commission on each sale.
- **Where the money is:** domain commissions are small (a dollar or two). **Hosting and website-builder signups pay far more** (often $50 to $100+ each), so the natural upsell is "you found your domain, now get it online."
- **Candidate programs:** Namecheap, GoDaddy, Dynadot, Hostinger (confirm current terms and whether Nigerian affiliates are accepted).
- **Cost:** none.

### Phase 2: Become a domain reseller (once there is traffic)
- **How it works:** Domaa buys domains at wholesale price through a registrar's API and sells them directly at its own price. The customer never leaves Domaa.
- **Reseller options:**

| Provider | Notes |
|---|---|
| ResellerClub | Popular in Africa and India. Prepaid deposit, API access, set your own prices. Easiest start. |
| Namecheap API | Requires an account that meets their minimum spend or balance. |
| GoDaddy Reseller | White-label storefront for a yearly fee. Less flexible, less to build. |
| OpenSRS / Enom (Tucows) | Wholesale for high volume. Bigger deposit, stricter requirements. |

- **Nigerian-market advantage:** accept **naira payments through Paystack**. Many Nigerians struggle to pay for domains with foreign-currency cards. Paying in naira is a clear reason to choose Domaa over global registrars.
- **Economics:** a .com costs a reseller roughly $10 to $11 wholesale, so each sale earns about $2 to $5. **Renewals** are the long-term value: customers pay again every year.
- **Responsibilities:** customer support, DNS management, domain transfers, refunds, abuse reports, currency risk (paying in dollars, collecting in naira), and building accounts, checkout, a "my domains" dashboard and renewal reminders.
- **Side benefit:** reseller APIs provide live prices and availability for every extension, which fixes the missing .io/.co/.me and the estimated-price gaps.

### Phase 3: More revenue
- **Premium and aftermarket domains:** earn commission by sending buyers to taken domains that are listed for sale (through Sedo or Afternic). This turns "Taken" results into revenue.
- **Paid features:** bulk searches, saved lists, AI-generated brandable names, alerts when a taken domain expires.
- **.ng domains:** resell Nigerian .ng domains through a NiRA-accredited registrar, and consider becoming accredited later.

### Not recommended
**Becoming an ICANN-accredited registrar.** It requires tens of thousands of dollars in fees and capital reserves, plus ongoing compliance work. It only makes sense at very large volume.

---

## 5. Brand foundations

Everything below comes from the product and business model above. Treat these as starting points to refine, not final decisions.

### The problem Domaa solves
Finding a domain is frustrating. You think of a great name, and it is taken. You try variations, and they are taken too. Domain sites push you toward expensive premium names, and they upsell hard. For Nigerian and African founders, paying in foreign currency adds another barrier.

### The promise
**No dead ends.** Every name Domaa shows you, you can actually buy.

### Who it is for
- **Primary:** founders, freelancers and small business owners starting something new who need a name and a domain quickly.
- **Secondary:** agencies and designers naming projects for clients; side-project builders and developers.
- **Market focus (later phases):** Nigerian and African founders who want to pay in naira.

### What makes Domaa different
1. **Real availability, checked live:** no suggestions that turn out to be taken.
2. **Honest by design:** never claims a domain is free unless the registry confirms it; prices clearly marked as estimates.
3. **Starts from an idea, not a name:** you describe your business in plain words, and Domaa does the brainstorming.
4. **Budget-aware:** filter by what you are willing to pay.
5. **Local payments (planned):** pay in naira through Paystack.

### Suggested personality
- **Honest and straightforward:** no tricks, no pushy upsells, no inflated claims.
- **Quick and light:** one box, instant answers.
- **Encouraging:** Domaa is on the founder's side, helping them start something.
- **Smart but not technical:** the registry checking is serious work under the hood, but the surface feels simple.

### Voice examples
- Instead of "Domain search results," say "Here's what you can grab."
- Instead of "Status: Unavailable," say "Taken" (plain, no drama).
- Instead of "Unknown," say something like "Couldn't confirm, check at the registrar."

### Name notes
"Domaa" is short, easy to say, and clearly related to "domain." The double "a" is soft and friendly, and it can be a distinctive visual element in a wordmark.

### Questions to answer during brand work
1. Local or global? Should the brand feel proudly Nigerian or African, or neutral and global with local payments as a feature?
2. Playful or trustworthy? Payments and domain ownership call for trust; the naming side invites playfulness. Where on that range should Domaa sit?
3. What should the double "a" in the name become visually, if anything?
4. Which Domaa domain will be the official home (domaa.com, domaa.ng, or another)?
5. Will the brand need to stretch to hosting and website tools later (phase 3), or stay focused on domains?

---

## 6. Suggested next steps

1. Build the brand identity (logo, colors, typography, voice) using this brief.
2. Apply the brand to the app, replacing the current plain gray UI.
3. Join affiliate programs and add tracking links and a hosting suggestion to results.
4. Set up Domaa's own code repository and deploy it publicly.
5. Once there is traffic, open a reseller account and build naira checkout through Paystack.
