import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { ContactUsServices } from "./contactUs.service";

const submitContactUs = catchAsync(async (req, res) => {
  const contactData = req.body;
  const userId = req.user?.id;

  const result = await ContactUsServices.submitContactUs(contactData, userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message:
      "Your message has been sent successfully. A representative will reply to your email promptly.",
    data: result,
  });
});

const getAllContactUs = catchAsync(async (req, res) => {
  const result = await ContactUsServices.getAllContactUsFromDB(req.query);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Contact messages retrieved successfully",
    data: result,
  });
});

const getContactUsById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await ContactUsServices.getContactUsByIdFromDB(id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Contact message retrieved successfully by this ID",
    data: result,
  });
});

const updateContactUsStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await ContactUsServices.updateContactUsStatusInDB(
    id,
    req.body,
  );
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Contact message updated successfully",
    data: result,
  });
});

const deleteContactUsById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await ContactUsServices.deleteContactUsByIdFromDB(id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Contact message deleted successfully",
    data: result,
  });
});

export const ContactUsControllers = {
  submitContactUs,
  getAllContactUs,
  getContactUsById,
  updateContactUsStatus,
  deleteContactUsById,
};
