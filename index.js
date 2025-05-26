require('dotenv').config();

const express = require("express");
const axios = require("axios");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");

const app = express();
app.use(express.json());

// Shopify API credentials
const SHOPIFY_STORE = process.env.SHOPIFY_STORE;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const WEBHOOK_VERSION = process.env.WEBHOOK_VERSION;

// Connect to MongoDB (for storing previous metafield values)
mongoose.connect(
    process.env.MONGODB_URI,
).then(() => console.log("Successfully Connected"))
    .catch((err) => console.error("Error while connecting DB: ", err));

// Define schema for storing metafields
const metafieldSchema = new mongoose.Schema({
    companyId: Number,
    namespace: String,
    key: String,
    value: Number,
});
const Metafield = mongoose.model("Metafield", metafieldSchema);

// Fetch current metafields from Shopify API
const getMetafields = async (companyId, companyGid) => {
    console.log("Company ID: ", companyGid);

    const url = `https://${SHOPIFY_STORE}.myshopify.com/admin/api/${WEBHOOK_VERSION}/graphql.json`;

    const query = `
        query getCompany($id: ID!) {
            company(id: $id) {
                id
                name
                createdAt
                updatedAt
                metafields(first: 10) {
                    edges {
                        node {
                            namespace
                            key
                            value
                        }
                    }
                }
            }
        }
    `;

    try {
        const response = await axios.post(
            url,
            { query, variables: { id: companyGid } },
            {
                headers: {
                    "X-Shopify-Access-Token": ACCESS_TOKEN,
                    "Content-Type": "application/json"
                }
            }
        );

        console.log("Company Data:", response.data.data.company.metafields.edges);
        return response.data.data.company.metafields.edges;
    } catch (error) {
        console.error("Error fetching company data:", error.response?.data || error.message);
        return [];
    }
};

// Function to send email notifications
const sendEmail = async (changedMetafields) => {
    // Looking to send emails in production? Check out our Email API/SMTP product!
    const transporter = nodemailer.createTransport({
        host: "sandbox.smtp.mailtrap.io",
        port: 2525,
        auth: {
            user: "9256662634aa65",
            pass: "12e6d53fcdfca1"
        }
    });

    const mailOptions = {
        from: process.env.MAIL_FROM,
        to: process.env.MAIL_TO,
        subject: "Company Metafield Updated",
        text: `The following metafields were updated:\n\n${JSON.stringify(changedMetafields, null, 2)}`,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("Email sent successfully!");
    } catch (error) {
        console.error("Error sending email:", error);
    }
};

// Webhook listener
app.post("/webhook", async (req, res) => {
    const companyData = req.body;
    const companyGid = companyData.admin_graphql_api_id;
    const companyId = companyGid.split("/").pop();

    console.log("Company Update: ", companyData);

    // Fetch current metafields from Shopify API
    const currentMetafields = await getMetafields(companyId, companyGid);
    let changedMetafields = [];

    // Check each metafield against stored values
    for (let metafield of currentMetafields) {
        const { namespace, key, value: newValue } = metafield.node;
        const keyIdentifier = { companyId, namespace, key };

        // Fetch previous metafield value from MongoDB
        const previousEntry = await Metafield.findOne(keyIdentifier);
        const oldValue = previousEntry ? previousEntry.value : null;

        // If value has changed, add to the email list
        if (oldValue !== null && oldValue !== newValue) {
            changedMetafields.push({ key, oldValue, newValue });

            // Update metafield value in database
            await Metafield.updateOne(keyIdentifier, { value: newValue }, { upsert: true });
        } else if (!previousEntry) {
            // If metafield is new, store it
            await Metafield.create({ ...keyIdentifier, value: newValue });
        }
    }

    // Send email if any metafield changed
    if (changedMetafields.length > 0) {
        await sendEmail(changedMetafields);
    }

    res.status(200).send("Webhook received");
});

// Start server
app.listen(3000, () => console.log("Webhook listener running on port 3000"));
