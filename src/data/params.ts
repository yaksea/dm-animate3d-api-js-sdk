export class ProcessParams {
  formats?: string[];
  model_id?: string;
  config: string;
  sim?: number;
  track_face?: number;
  track_hand?: number;
  foot_locking_mode?: string;
  video_speed_multiplier?: number;
  pose_filtering_strength?: number;
  upper_body_only?: boolean;
  root_at_origin?: boolean;
  trim?: [number, number];
  crop?: [number, number, number, number];
  render_sbs?: number;
  render_bg_color?: [number, number, number, number];
  render_backdrop?: string;
  render_shadow?: number;
  render_include_audio?: number;
  render_cam_mode?: number;
  private _models?: Array<{ trackingId: string; modelId: string }>;
  private _pipeline?: string;

  constructor(options?: Partial<ProcessParams> & { _models?: Array<{ trackingId: string; modelId: string }>; _pipeline?: string }) {
    this.formats = options?.formats;
    this.model_id = options?.model_id;
    this.config = options?.config || 'configDefault';
    this.sim = options?.sim;
    this.track_face = options?.track_face;
    this.track_hand = options?.track_hand;
    this.foot_locking_mode = options?.foot_locking_mode;
    this.video_speed_multiplier = options?.video_speed_multiplier;
    this.pose_filtering_strength = options?.pose_filtering_strength;
    this.upper_body_only = options?.upper_body_only;
    this.root_at_origin = options?.root_at_origin;
    this.trim = options?.trim;
    this.crop = options?.crop;
    this.render_sbs = options?.render_sbs;
    this.render_bg_color = options?.render_bg_color;
    this.render_backdrop = options?.render_backdrop;
    this.render_shadow = options?.render_shadow;
    this.render_include_audio = options?.render_include_audio;
    this.render_cam_mode = options?.render_cam_mode;
    this._models = options?._models;
    this._pipeline = options?._pipeline;
  }

  set models(value: Array<{ trackingId: string; modelId: string }> | undefined) {
    this._models = value;
  }

  get models(): Array<{ trackingId: string; modelId: string }> | undefined {
    return this._models;
  }

  set pipeline(value: string | undefined) {
    this._pipeline = value;
  }

  get pipeline(): string | undefined {
    return this._pipeline;
  }

  toParamsList(): string[] {
    const params: string[] = [];

    if (this.config) {
      params.push(`config=${this.config}`);
    }

    if (this.formats) {
      const formatsStr = this.formats.join(',');
      params.push(`formats=${formatsStr}`);
    }

    if (this.model_id) {
      params.push(`model=${this.model_id}`);
    }

    if (this._models) {
      const modelsJson = JSON.stringify(this._models);
      params.push(`models=${modelsJson}`);
    }

    if (this.sim !== undefined) {
      params.push(`sim=${this.sim}`);
    }

    if (this.track_face !== undefined) {
      params.push(`trackFace=${this.track_face}`);
    }

    if (this.track_hand !== undefined) {
      params.push(`trackHand=${this.track_hand}`);
    }

    if (this.foot_locking_mode) {
      params.push(`footLockingMode=${this.foot_locking_mode}`);
    }

    if (this.video_speed_multiplier !== undefined) {
      params.push(`videoSpeedMultiplier=${this.video_speed_multiplier}`);
    }

    if (this.pose_filtering_strength !== undefined) {
      params.push(`poseFilteringStrength=${this.pose_filtering_strength}`);
    }

    if (this.upper_body_only !== undefined) {
      params.push(`upperBodyOnly=${this.upper_body_only.toString().toLowerCase()}`);
    }

    if (this.root_at_origin !== undefined) {
      params.push(`rootAtOrigin=${this.root_at_origin.toString().toLowerCase()}`);
    }

    if (this.trim) {
      params.push(`trim=${this.trim[0]},${this.trim[1]}`);
    }

    if (this.crop) {
      params.push(
        `crop=${this.crop[0]},${this.crop[1]},${this.crop[2]},${this.crop[3]}`
      );
    }

    if (this.render_sbs !== undefined) {
      params.push(`render.sbs=${this.render_sbs}`);
    }

    if (this.render_bg_color) {
      params.push(
        `render.bgColor=${this.render_bg_color[0]},${this.render_bg_color[1]},${this.render_bg_color[2]},${this.render_bg_color[3]}`
      );
    }

    if (this.render_backdrop) {
      params.push(`render.backdrop=${this.render_backdrop}`);
    }

    if (this.render_shadow !== undefined) {
      params.push(`render.shadow=${this.render_shadow}`);
    }

    if (this.render_include_audio !== undefined) {
      params.push(`render.includeAudio=${this.render_include_audio}`);
    }

    if (this.render_cam_mode !== undefined) {
      params.push(`render.CamMode=${this.render_cam_mode}`);
    }

    if (this._pipeline) {
      params.push(`pipeline=${this._pipeline}`);
    }

    return params;
  }

  copy(): ProcessParams {
    const options: Partial<ProcessParams> & { _models?: Array<{ trackingId: string; modelId: string }>; _pipeline?: string } = {
      formats: this.formats?.slice(),
      model_id: this.model_id,
      config: this.config,
      sim: this.sim,
      track_face: this.track_face,
      track_hand: this.track_hand,
      foot_locking_mode: this.foot_locking_mode,
      video_speed_multiplier: this.video_speed_multiplier,
      pose_filtering_strength: this.pose_filtering_strength,
      upper_body_only: this.upper_body_only,
      root_at_origin: this.root_at_origin,
      trim: this.trim,
      crop: this.crop,
      render_sbs: this.render_sbs,
      render_bg_color: this.render_bg_color,
      render_backdrop: this.render_backdrop,
      render_shadow: this.render_shadow,
      render_include_audio: this.render_include_audio,
      render_cam_mode: this.render_cam_mode,
      _models: this._models?.map(m => ({ ...m })),
      _pipeline: this._pipeline
    };
    return new ProcessParams(options);
  }
}