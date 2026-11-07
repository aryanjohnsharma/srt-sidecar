# Third-party notices

This project currently uses:

- [Transformers.js](https://github.com/huggingface/transformers.js) for browser inference. Review the package license and its bundled ONNX Runtime Web notices in the installed dependency before release.
- [ONNX Community Whisper Base Timestamped](https://huggingface.co/onnx-community/whisper-base_timestamped) as the initial model candidate. Review the model repository card, exact model files, conversion provenance, and license before publishing a model selection as final.
- [Pikaicons](https://pikaicons.com/free-icons) free UI icons through `@pikaicons/core-free` and `@pikaicons/react` 0.1.0. The free pack is MIT licensed; its notice is retained in [`public/licenses/PIKAICONS-MIT.txt`](public/licenses/PIKAICONS-MIT.txt).
- [React Bits](https://reactbits.dev/) `Dither` background component. See the [React Bits license information](https://reactbits.dev/).
- [ReactDrops](https://reactdrops.dev/) `Liquid Glass Logo` component, version 0.1.0, under ReactDrops Component License 1.0. The license text is retained in [`src/components/REACTDROPS_LICENSE.txt`](src/components/REACTDROPS_LICENSE.txt).
- DM Sans and DM Mono font files requested from Google Fonts at runtime.

The selected model is `onnx-community/whisper-base_timestamped`; its exact revision has not yet been pinned. The ReactDrops license restricts redistribution of the component as a standalone or reusable development asset and does not grant a project-wide license. Review the full notice before publishing this application source. This list should be expanded with exact package versions, model revision, applicable license texts, and attribution before release.
