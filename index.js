const express = require("express");
const axios = require("axios");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");

const app = express();
app.use(express.json());

// Shopify API credentials
const SHOPIFY_STORE = "<your_store_name>";
const ACCESS_TOKEN = "<developed_app_access_token>";
const WEBHOOK_VERSION = "<developed_app_webhook_version>";

// Connect to MongoDB (for storing previous metafield values)
mongoose.connect(
    "mongodb+srv://wac:gdlTgCW1Ig1fyqA6@chalkless.oh7np7l.mongodb.net/?retryWrites=true&w=majority&appName=Chalkless",
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
    const transporter = nodemailer.createTransport({
        service: "<mail_service_name>",
        auth: {
            user: "<from_email>",
            pass: "<password>",
        },
    });

    const mailOptions = {
        from: "<from_email>",
        to: "<to_email>",
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
