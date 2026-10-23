# NodeCast reference-led design

The user’s supplied healthcare UI references determine the visual palette and composition. Chime remains an information-architecture reference: clear hierarchy, direct navigation, grouped controls, and trust through understandable states. This is an independent IPTV interface, not a copied banking or healthcare app.

## Palette and type

- Lavender: #B9B4F2 for banners, selected segments, and illustrations.
- Ink: #090124 for text and high-contrast surfaces.
- Soft gray: #EAE9EE for borders and secondary surfaces.
- Cream: #FAE7C8 for the original TV mascot and warm accents.
- Supporting accessible lavender: #726BC1 for small labels on white; decorative pale lavender is not used as low-contrast body text.
- Crimson Text regular, bundled under its SIL Open Font License, for editorial headings. Native system sans-serif for forms, metadata, labels, and navigation.

## Screen decisions

- Welcome: quiet gradient, a clear serif headline, original cream TV character, and one black primary action. No account wall or fake carousel.
- Home: compact greeting/profile control, lavender library banner, visible public IP/location summary, category shortcuts, and real playlist/demo artwork. Longer security explanations are in a details sheet.
- Library: segmented media types, explicit search, category pills, readable live-channel rows, and movie/series poster grids.
- Favorites: per-profile collection, with a useful empty state.
- Profiles/provider form: concise local-storage explanation, saved source cards, and clear add/edit/remove actions with deletion confirmation.
- Playback: native video controls; a separate, explicit external-player selection with disclosure.
- Navigation: floating black tab bar with lavender active state; all controls retain accessibility labels.

No programme guide, viewing progress, VPN-connected badge, or account-sync UI is invented for screenshots. Screenshots are captured from the actual running browser preview; physical iPhone behavior is a separate verification step. Demo IP/location fixtures are labeled when used for capture. No ZIP is created until the user asks.
