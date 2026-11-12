import { ISoftDeleteModel } from "../../../types/softDelete";
import { TFaqRole } from "./faq.constant";

export type TFaq = {
  question: string;
  answer: string;
  role: TFaqRole;
  order?: number;
};

export type FaqModel = ISoftDeleteModel<TFaq>;
