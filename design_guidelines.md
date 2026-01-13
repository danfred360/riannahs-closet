# Riannah's Closet - Design Guidelines

## Brand Identity

**Purpose**: A personal wardrobe management app to catalog clothing items, create outfit combinations, and visually plan daily looks.

**Aesthetic Direction**: Organic/botanical - soft curves, earthy palette, hand-drawn floral illustrations. Think garden journal meets fashion lookbook. The memorable element is delicate botanical line art that frames content and celebrates the act of curating a wardrobe.

**Differentiation**: Hand-drawn floral borders and botanical accents throughout. Not generic fashion app – feels like a personal style diary.

## Navigation Architecture

**Root Navigation**: Tab Bar (4 tabs) + Floating Action Button

**Tabs**:
1. **Wardrobe** - Browse all clothing items
2. **Outfits** - Saved outfit combinations
3. **Calendar** - Plan outfits by date
4. **Profile** - Settings and preferences

**Floating Action Button** (positioned bottom-right, above tab bar):
- Primary action: "Add Item" or "Create Outfit" (context-aware based on current tab)

**Auth**: None (single-user app). Profile screen includes customizable avatar and display name for personalization.

## Screen Specifications

### 1. Wardrobe Screen (Tab 1)
- **Purpose**: Browse and filter clothing items
- **Layout**:
  - Transparent header with right button (filter icon)
  - Search bar below header
  - Grid of clothing item cards (2 columns)
  - Top inset: headerHeight + Spacing.xl
  - Bottom inset: tabBarHeight + Spacing.xl
- **Components**: Search input, filter chips (All, Tops, Bottoms, Dresses, Shoes, Accessories), item cards with image + name
- **Empty State**: "empty-wardrobe.png" illustration with "Start building your wardrobe"

### 2. Item Detail Screen (Modal)
- **Purpose**: View/edit single clothing item
- **Layout**:
  - Default header with left back button, right edit button
  - Scrollable content
  - Large item image at top
  - Item name, category, tags below
  - Delete button at bottom
  - Top inset: Spacing.xl, Bottom inset: insets.bottom + Spacing.xl
- **Components**: Image viewer, text fields, tag chips, delete button

### 3. Add/Edit Item Screen (Modal)
- **Purpose**: Add new item or edit existing
- **Layout**:
  - Default header with left cancel, right save button
  - Scrollable form
  - Photo upload area, name input, category dropdown, tags input
  - Top inset: Spacing.xl, Bottom inset: insets.bottom + Spacing.xl

### 4. Outfits Screen (Tab 2)
- **Purpose**: Browse saved outfit combinations
- **Layout**:
  - Transparent header
  - Grid of outfit cards (2 columns, each showing composite preview of items)
  - Top inset: headerHeight + Spacing.xl
  - Bottom inset: tabBarHeight + Spacing.xl
- **Empty State**: "empty-outfits.png" with "Create your first outfit"

### 5. Outfit Builder Screen (Modal)
- **Purpose**: Create/edit outfit combination
- **Layout**:
  - Default header with left cancel, right save
  - Canvas area showing selected items visually stacked
  - Scrollable item picker at bottom (horizontal scroll of wardrobe items)
  - Top inset: Spacing.xl, Bottom inset: insets.bottom + Spacing.xl

### 6. Calendar Screen (Tab 3)
- **Purpose**: Plan outfits by date
- **Layout**:
  - Transparent header
  - Month calendar view with outfit thumbnails on planned dates
  - Selected date shows full outfit preview below calendar
  - Top inset: headerHeight + Spacing.xl
  - Bottom inset: tabBarHeight + Spacing.xl
- **Empty State**: "empty-calendar.png" with "Plan your week ahead"

### 7. Profile Screen (Tab 4)
- **Purpose**: User settings and preferences
- **Layout**:
  - Transparent header
  - Avatar (customizable, 1 preset floral-themed avatar provided)
  - Display name field
  - Settings list: Theme preference, Notifications, About
  - Top inset: headerHeight + Spacing.xl
  - Bottom inset: tabBarHeight + Spacing.xl

## Color Palette

- **Primary**: #8B6F47 (warm taupe - earthy, sophisticated)
- **Accent**: #C19A6B (dusty gold - highlights, botanical accents)
- **Background**: #FAF8F5 (cream white - soft, warm base)
- **Surface**: #FFFFFF (cards, elevated elements)
- **Text Primary**: #2C2416 (deep brown)
- **Text Secondary**: #6B5D4F (muted brown)
- **Border**: #E8E3DB (subtle botanical frame lines)
- **Success**: #7A9B76 (sage green)
- **Semantic Overlay**: rgba(0,0,0,0.4)

## Typography

- **Primary Font**: Cormorant Garamond (elegant serif for headers)
- **Body Font**: Inter (clean sans-serif for readability)
- **Scale**:
  - Title: Cormorant, 32pt, Bold
  - Heading: Cormorant, 24pt, SemiBold
  - Subheading: Inter, 18pt, Medium
  - Body: Inter, 16pt, Regular
  - Caption: Inter, 14pt, Regular

## Visual Design

- Floating action button uses shadow: offset (0, 2), opacity 0.10, radius 2
- Cards have soft rounded corners (12pt radius)
- Botanical line art (thin, hand-drawn style) frames section headers
- Item cards show clothing on cream/white background
- All touchable elements have subtle press state (opacity 0.7)

## Assets to Generate

1. **icon.png** - App icon with botanical "RC" monogram and small floral accent
2. **splash-icon.png** - Same as icon but larger for splash screen
3. **empty-wardrobe.png** - Open wardrobe with hanging rod, soft floral vine, WHERE USED: Wardrobe screen empty state
4. **empty-outfits.png** - Dress form silhouette with botanical wreath, WHERE USED: Outfits screen empty state
5. **empty-calendar.png** - Calendar page with pressed flower corner, WHERE USED: Calendar screen empty state
6. **avatar-floral.png** - Preset user avatar with botanical wreath circle, WHERE USED: Profile screen default avatar
7. **botanical-divider.png** - Horizontal floral line divider, WHERE USED: Section breaks throughout app

**Style Note**: All illustrations use simple line art in Primary color (#8B6F47) with optional Accent highlights, matching the organic aesthetic.