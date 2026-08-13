import mongoose from 'mongoose';

export interface ImageAttrs {
  name: string;
  key: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  status: string;
}

export interface ImageDoc extends mongoose.Document {
  name: string;
  key: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ImageModel extends mongoose.Model<ImageDoc> {
  build(attrs: ImageAttrs): ImageDoc;
}

const imageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    key: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    thumbnailUrl: {
      type: String,
    },
    status: {
      type: String,
      required: true,
      default: 'pending',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

imageSchema.statics.build = (attrs: ImageAttrs) => {
  return new Image(attrs);
};

const Image = mongoose.model<ImageDoc, ImageModel>('Image', imageSchema);

export { Image };
